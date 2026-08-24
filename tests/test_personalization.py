"""Unit tests for Groq Personalization and Prompt Construction."""

import pytest
import json
from unittest.mock import MagicMock, patch
from app.personalization.groq import GroqPersonalizationService
from app.personalization.prompts import build_personalization_prompt, SYSTEM_PROMPT
from app.schemas.influencer import InfluencerProfile, VideoMetadata
from app.schemas.messages import PersonalizationRequest, VideoContext


@pytest.fixture
def mock_influencer():
    return InfluencerProfile(
        id=1,
        channel_id="UC_TEST_AI",
        name="Sarah AI Dev",
        profile_url="https://youtube.com/@sarahaidev",
        followers=24000,
        niche="AI",
        content_themes=["AI Tools & Workflows", "Python Development"],
        brand_fit_score=85.0,
        recent_videos=[
            VideoMetadata(
                video_id="v1",
                title="5 Open-Source LLM Tools You Must Try",
                views=12000,
                published_at="2026-07-20",
            ),
            VideoMetadata(
                video_id="v2",
                title="Building AI Agents with LangChain and Llama",
                views=18000,
                published_at="2026-08-01",
            ),
        ],
    )


def test_build_personalization_prompt(mock_influencer):
    """Test user prompt structure contains actual creator context without fabrication."""
    req = PersonalizationRequest(
        name=mock_influencer.name,
        followers=mock_influencer.followers,
        niche=mock_influencer.niche,
        content_themes=mock_influencer.content_themes,
        recent_videos=[VideoContext(title=v.title, views=v.views) for v in mock_influencer.recent_videos],
        brand_fit_score=mock_influencer.brand_fit_score,
    )
    prompt = build_personalization_prompt(req)

    assert "Sarah AI Dev" in prompt
    assert "24000" in prompt
    assert "5 Open-Source LLM Tools You Must Try" in prompt
    assert "Building AI Agents with LangChain and Llama" in prompt
    assert "STRICTLY between 60 and 90 words" in SYSTEM_PROMPT


@patch("app.personalization.groq.GroqPersonalizationService._get_client")
def test_successful_groq_personalization(mock_get_client, mock_influencer):
    """Test end-to-end personalization generation with mocked Groq SDK."""
    # A valid email with exactly 72 words (within 60-90 words range)
    valid_email_body = (
        "Hi Sarah, I really enjoyed your practical breakdown in 5 Open-Source LLM Tools You Must Try. "
        "Your hands-on approach to agentic development resonated with our engineering team. We are building "
        "a high-performance developer platform and would love to partner on a technical deep-dive or sponsored "
        "showcase of our new AI API. Would you be open to collaborating on an upcoming video? Let me know "
        "if you would like to explore this further. Best, Alex at DevRel Team."
    )
    # A valid DM with exactly 22 words (within 15-30 words range)
    valid_dm = "Hey Sarah! Loved your breakdown of open-source LLM tools. Would love to sponsor a technical demo on your channel. Open to chatting?"

    mock_llm_json = json.dumps({
        "content_summary": "Hands-on tutorials focusing on open-source LLMs and AI agent workflows.",
        "personalization_signals": ["5 Open-Source LLM Tools You Must Try", "LangChain and Llama tutorial"],
        "collaboration_angle": "Technical Developer Tooling Showcase",
        "email_subject": "Loved your open-source LLM video - Collaboration inquiry",
        "email": valid_email_body,
        "instagram_dm": valid_dm,
    })

    mock_choice = MagicMock()
    mock_choice.message.content = mock_llm_json
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_response
    mock_get_client.return_value = mock_client

    service = GroqPersonalizationService(api_key="gsk_test_key_123")
    result = service.personalize_creator(mock_influencer)

    assert result.validation_status == "VALID"
    assert result.influencer_name == "Sarah AI Dev"
    assert 60 <= result.email_word_count <= 90
    assert 15 <= result.dm_word_count <= 30
    assert result.collaboration_angle == "Technical Developer Tooling Showcase"
