"""System and user prompts for Groq LLM personalization."""

import json
from app.schemas.messages import PersonalizationRequest

SYSTEM_PROMPT = """You are an expert AI influencer partnerships manager crafting authentic, highly tailored collaboration outreach.

STRICT DATA INTEGRITY & GUARDRAILS:
1. Use ONLY the factual information provided in the creator's profile and recent video list.
2. NEVER invent or hallucinate videos, achievements, audience demographics, statistics, brands, or endorsements.
3. If recent videos are not provided, do not pretend they exist.
4. Avoid excessive flattery or generic filler templates.
5. NEVER include bracketed or template placeholders such as [Your Name], [Company], {brand}, or <Insert Link>. Write complete, ready-to-send messages from 'Alex at DevRel Team'.
6. WORD COUNT REQUIREMENTS:
   - Email pitch: STRICTLY between 60 and 90 words.
   - Instagram DM: STRICTLY between 15 and 30 words.
7. Tone: Professional, direct, respectful of creator's craft, and developer-aligned.

You must respond ONLY with a valid JSON object matching the requested schema."""


def build_personalization_prompt(req: PersonalizationRequest, retry_feedback: str = "") -> str:
    """Build structured user prompt with creator context."""
    videos_formatted = []
    for v in req.recent_videos[:5]:
        v_dict = {"title": v.title}
        if v.views > 0:
            v_dict["views"] = v.views
        if v.published_at:
            v_dict["published_at"] = v.published_at
        videos_formatted.append(v_dict)

    context_payload = {
        "name": req.name,
        "platform": req.platform,
        "followers": req.followers,
        "niche": req.niche,
        "content_themes": req.content_themes,
        "recent_videos": videos_formatted,
        "brand_fit_score": req.brand_fit_score,
    }

    prompt = f"""Generate a personalized collaboration email and Instagram DM for the following verified creator:

CREATOR DATA:
{json.dumps(context_payload, indent=2)}

OUTPUT REQUIREMENTS:
Return a valid JSON object with the following exact keys:
{{
  "content_summary": "1-2 sentences summarizing their recent content focus based on provided titles",
  "personalization_signals": ["Specific signal 1 referencing an actual video title", "Specific signal 2"],
  "collaboration_angle": "Dynamic collaboration format (e.g. sponsorship, technical deep-dive showcase, developer tooling demo, affiliate)",
  "email_subject": "Catchy, relevant, and personalized subject line",
  "email": "Personalized pitch body (STRICTLY 60 to 90 words, mentions real content, specific proposal, no placeholders)",
  "instagram_dm": "Concise direct message (STRICTLY 15 to 30 words, casual and direct, no placeholders)"
}}
"""
    if retry_feedback:
        prompt += f"\n\nIMPORTANT CORRECTION FROM PREVIOUS ATTEMPT:\n{retry_feedback}\nPlease ensure all word counts and formatting constraints are strictly satisfied."

    return prompt
