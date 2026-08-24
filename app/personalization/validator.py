"""Validation suite for AI-generated outreach messages."""

import json
from typing import Tuple, List, Optional
from pydantic import ValidationError
from app.schemas.messages import PersonalizationResponse
from app.utils.text import count_words, has_placeholders
from app.utils.logging import get_logger

logger = get_logger("personalization.validator")


class MessageValidator:
    """Validates message length, placeholders, schema compliance, and personalization quality."""

    MIN_EMAIL_WORDS = 60
    MAX_EMAIL_WORDS = 90
    MIN_DM_WORDS = 15
    MAX_DM_WORDS = 30

    def parse_and_validate_json(self, raw_json_str: str) -> Tuple[Optional[PersonalizationResponse], List[str]]:
        """Parse raw LLM output string into PersonalizationResponse."""
        errors: List[str] = []
        if not raw_json_str or not raw_json_str.strip():
            return None, ["Empty response from model"]

        clean_json = raw_json_str.strip()

        # Strip reasoning models <think>...</think> tags if present
        import re
        clean_json = re.sub(r"<think>.*?</think>", "", clean_json, flags=re.DOTALL).strip()

        # Clean any accidental markdown code blocks
        if "```json" in clean_json:
            clean_json = clean_json.split("```json", 1)[1]
            if "```" in clean_json:
                clean_json = clean_json.split("```", 1)[0]
        elif "```" in clean_json:
            clean_json = clean_json.split("```", 1)[1]
            if "```" in clean_json:
                clean_json = clean_json.split("```", 1)[0]

        clean_json = clean_json.strip()

        # Extract between first { and last } if needed
        if "{" in clean_json and "}" in clean_json:
            first_idx = clean_json.find("{")
            last_idx = clean_json.rfind("}")
            clean_json = clean_json[first_idx : last_idx + 1]

        try:
            data = json.loads(clean_json)
        except json.JSONDecodeError as e:
            return None, [f"Invalid JSON syntax: {e}"]

        try:
            parsed = PersonalizationResponse.model_validate(data)
            return parsed, []
        except ValidationError as e:
            for err in e.errors():
                loc = " -> ".join(str(l) for l in err["loc"])
                errors.append(f"Field '{loc}': {err['msg']}")
            return None, errors

    def validate_message(
        self,
        response: PersonalizationResponse,
        creator_name: str = "",
    ) -> Tuple[bool, List[str], int, int]:
        """Validate word counts, placeholders, and content substance."""
        errors: List[str] = []

        # 1. Word counts
        email_words = count_words(response.email)
        dm_words = count_words(response.instagram_dm)

        if email_words < self.MIN_EMAIL_WORDS:
            errors.append(
                f"Email word count ({email_words} words) is below minimum of {self.MIN_EMAIL_WORDS} words."
            )
        elif email_words > self.MAX_EMAIL_WORDS:
            errors.append(
                f"Email word count ({email_words} words) exceeds maximum of {self.MAX_EMAIL_WORDS} words."
            )

        if dm_words < self.MIN_DM_WORDS:
            errors.append(
                f"Instagram DM word count ({dm_words} words) is below minimum of {self.MIN_DM_WORDS} words."
            )
        elif dm_words > self.MAX_DM_WORDS:
            errors.append(
                f"Instagram DM word count ({dm_words} words) exceeds maximum of {self.MAX_DM_WORDS} words."
            )

        # 2. Placeholder detection
        email_has_placeholders, email_tokens = has_placeholders(response.email)
        if email_has_placeholders:
            errors.append(f"Email contains unfilled template placeholders: {', '.join(email_tokens)}")

        dm_has_placeholders, dm_tokens = has_placeholders(response.instagram_dm)
        if dm_has_placeholders:
            errors.append(f"Instagram DM contains unfilled template placeholders: {', '.join(dm_tokens)}")

        # 3. Subject and angle non-empty
        if not response.email_subject or len(response.email_subject.strip()) < 5:
            errors.append("Email subject line is empty or too short.")

        if not response.collaboration_angle or len(response.collaboration_angle.strip()) < 3:
            errors.append("Collaboration angle is missing.")

        if not response.personalization_signals:
            errors.append("Personalization signals list is empty.")

        is_valid = len(errors) == 0
        return is_valid, errors, email_words, dm_words
