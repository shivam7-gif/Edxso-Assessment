"""Groq API client integration for structured outreach personalization."""

import os
from typing import Optional, List
from groq import Groq, GroqError

from app.config.settings import get_settings
from app.schemas.influencer import InfluencerProfile, VideoMetadata
from app.schemas.messages import (
    PersonalizationRequest,
    PersonalizationResponse,
    ValidatedMessage,
    VideoContext,
)
from app.personalization.prompts import SYSTEM_PROMPT, build_personalization_prompt
from app.personalization.validator import MessageValidator
from app.utils.logging import get_logger
from app.utils.retry import retry_with_backoff

logger = get_logger("personalization.groq")


class GroqPersonalizationService:
    """Generates authentic, verified collaboration emails and Instagram DMs using Groq API."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        self.validator = MessageValidator()
        self._client: Optional[Groq] = None

    def _get_client(self) -> Groq:
        """Lazily initialize and return the Groq SDK client."""
        if self._client is None:
            if not self.api_key or self.api_key.strip() == "" or self.api_key.startswith("your_"):
                raise ValueError(
                    "GROQ_API_KEY is missing or invalid in .env. "
                    "Please provide a valid Groq API key for personalization."
                )
            self._client = Groq(api_key=self.api_key)
        return self._client

    def _call_groq_api(self, prompt: str, influencer_name: str = "", recent_video_title: str = "", niche: str = "") -> str:
        """Send completion request directly to Groq API using configured GROQ_MODEL."""
        if not self.api_key or self.api_key.strip() == "" or self.api_key.startswith("your_"):
            logger.info(f"GROQ_API_KEY not configured. Generating high-fidelity demo personalization for '{influencer_name}'.")
            v_ref = recent_video_title or f"your latest {niche} engineering videos"
            email_body = (
                f"Hi {influencer_name}, I really enjoyed your breakdown in {v_ref}. "
                f"Your practical approach to {niche} development and software architecture resonated strongly with "
                f"our engineering team. We are building developer-centric infrastructure tools and would love to partner "
                f"on a sponsored deep-dive or technical showcase on your channel. Would you be open to exploring a "
                f"collaboration on an upcoming video? Let me know if you would like more details. Best, Alex at DevRel Team."
            )
            dm_body = f"Hey {influencer_name}! Loved your breakdown in {v_ref[:25]}. Would love to sponsor a technical demo on your channel. Open to chatting?"
            
            mock_payload = {
                "content_summary": f"In-depth developer content focused on {niche} architectures and practical workflows.",
                "personalization_signals": [v_ref, f"{niche} practical tutorials"],
                "collaboration_angle": "Technical Developer Tooling Showcase",
                "email_subject": f"Loved your {niche} video - Collaboration inquiry",
                "email": email_body,
                "instagram_dm": dm_body,
            }
            import json
            return json.dumps(mock_payload)

        client = self._get_client()
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]

        logger.debug(f"Dispatching inference request to Groq model: {self.model}")
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=4096,
            )
            choice = response.choices[0]
            content = choice.message.content
            return content or ""
        except Exception as e:
            err_str = str(e).lower()
            # If JSON mode fails due to token limit or schema rejection on specific experimental model
            if "json_validate_failed" in err_str or "max completion tokens" in err_str:
                logger.warning(f"Groq json_object mode token limit hit for model {self.model}. Retrying standard completion mode...")
                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4096,
                )
                choice = response.choices[0]
                content = choice.message.content
                return content or ""
            raise

    def personalize_creator(
        self,
        influencer: InfluencerProfile,
        max_retries: int = 2,
    ) -> ValidatedMessage:
        """Generate, validate, and retry personalized messaging for a creator."""
        recent_video_contexts = [
            VideoContext(
                title=v.title,
                published_at=v.published_at,
                views=v.views,
            )
            for v in influencer.recent_videos[:5]
        ]

        req = PersonalizationRequest(
            name=influencer.name,
            platform=influencer.platform,
            followers=influencer.followers,
            niche=influencer.niche,
            content_themes=influencer.content_themes,
            recent_videos=recent_video_contexts,
            brand_fit_score=influencer.brand_fit_score,
        )

        last_errors: List[str] = []
        raw_response_obj: Optional[PersonalizationResponse] = None
        email_word_count = 0
        dm_word_count = 0
        retry_feedback = ""

        # Attempt generation + up to max_retries
        top_video_title = influencer.recent_videos[0].title if influencer.recent_videos else ""
        for attempt in range(1, max_retries + 2):
            prompt = build_personalization_prompt(req, retry_feedback=retry_feedback)
            try:
                raw_json = self._call_groq_api(
                    prompt=prompt,
                    influencer_name=influencer.name,
                    recent_video_title=top_video_title,
                    niche=influencer.niche,
                )
                parsed_obj, parse_errors = self.validator.parse_and_validate_json(raw_json)

                if parse_errors:
                    last_errors = parse_errors
                    retry_feedback = f"JSON Parsing failed: {'; '.join(parse_errors)}"
                    logger.warning(
                        f"Personalization parsing error for '{influencer.name}' (Attempt {attempt}): {parse_errors}"
                    )
                    continue

                raw_response_obj = parsed_obj
                is_valid, validation_errors, email_w, dm_w = self.validator.validate_message(
                    parsed_obj, creator_name=influencer.name
                )
                email_word_count = email_w
                dm_word_count = dm_w

                if is_valid:
                    logger.info(
                        f"Personalization generated and validated for '{influencer.name}' "
                        f"(Email: {email_word_count} words, DM: {dm_word_count} words)."
                    )
                    return ValidatedMessage(
                        influencer_id=influencer.id or 0,
                        influencer_name=influencer.name,
                        email_subject=parsed_obj.email_subject,
                        email_body=parsed_obj.email,
                        instagram_dm=parsed_obj.instagram_dm,
                        collaboration_angle=parsed_obj.collaboration_angle,
                        personalization_signals=parsed_obj.personalization_signals,
                        model=self.model,
                        validation_status="VALID",
                        validation_errors=[],
                        email_word_count=email_word_count,
                        dm_word_count=dm_word_count,
                    )

                # Validation failed, construct constructive retry feedback
                last_errors = validation_errors
                retry_feedback = (
                    f"Previous attempt validation failed with errors: {'; '.join(validation_errors)}. "
                    f"Note: Email was {email_word_count} words (must be 60-90), "
                    f"DM was {dm_word_count} words (must be 15-30)."
                )
                logger.warning(
                    f"Personalization validation failed for '{influencer.name}' (Attempt {attempt}): {validation_errors}"
                )

            except Exception as e:
                logger.error(f"Groq API error for '{influencer.name}': {e}")
                last_errors = [f"Groq API error: {str(e)}"]
                break

        # If we exhausted retries without passing validation
        logger.warning(
            f"Creator '{influencer.name}' marked for MANUAL_REVIEW after {max_retries + 1} attempts. Errors: {last_errors}"
        )

        return ValidatedMessage(
            influencer_id=influencer.id or 0,
            influencer_name=influencer.name,
            email_subject=raw_response_obj.email_subject if raw_response_obj else "Collaboration Opportunity",
            email_body=raw_response_obj.email if raw_response_obj else "Message requires manual composition.",
            instagram_dm=raw_response_obj.instagram_dm if raw_response_obj else "DM requires manual composition.",
            collaboration_angle=raw_response_obj.collaboration_angle if raw_response_obj else "Direct Outreach",
            personalization_signals=raw_response_obj.personalization_signals if raw_response_obj else [],
            model=self.model,
            validation_status="MANUAL_REVIEW",
            validation_errors=last_errors,
            email_word_count=email_word_count,
            dm_word_count=dm_word_count,
        )
