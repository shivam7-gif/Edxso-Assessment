"""Unit tests for message validation suite and word count constraints."""

import pytest
from app.personalization.validator import MessageValidator
from app.schemas.messages import PersonalizationResponse


@pytest.fixture
def validator():
    return MessageValidator()


def test_valid_email_and_dm(validator):
    """Test valid email (60-90 words) and DM (15-30 words)."""
    # 65 words
    email = (
        "Hi Alex, I enjoyed your recent deep dive into Python FastAPI performance optimization. "
        "Your practical benchmarking of asynchronous request routing was exceptionally thorough and helpful. "
        "We are launching a new high-throughput telemetry service designed for backend engineers and would love "
        "to sponsor an upcoming tutorial or product walkthrough on your channel. Are you open to discussing "
        "a potential collaboration this month? Best, Sarah from the DevRel Team."
    )
    # 20 words
    dm = "Hey Alex! Really liked your FastAPI performance benchmarks. Would love to sponsor a technical demo on your channel. Interested in chatting?"

    response = PersonalizationResponse(
        content_summary="Backend development and performance benchmarks with Python.",
        personalization_signals=["FastAPI performance optimization", "Asynchronous request routing"],
        collaboration_angle="Sponsored Product Walkthrough",
        email_subject="FastAPI performance video & collaboration idea",
        email=email,
        instagram_dm=dm,
    )

    is_valid, errors, email_words, dm_words = validator.validate_message(response)
    assert is_valid is True
    assert len(errors) == 0
    assert 60 <= email_words <= 90
    assert 15 <= dm_words <= 30


def test_email_too_short(validator):
    """Test email with fewer than 60 words is flagged as invalid."""
    email = "Hi! We love your channel and would love to collaborate on a video. Let us know if you're interested!"
    dm = "Hey! Loved your video. Would love to sponsor your next tech tutorial. Interested in chatting?"

    response = PersonalizationResponse(
        content_summary="Tech tutorials",
        personalization_signals=["Signal 1"],
        collaboration_angle="Sponsorship",
        email_subject="Collaboration Inquiry",
        email=email,
        instagram_dm=dm,
    )

    is_valid, errors, email_words, dm_words = validator.validate_message(response)
    assert is_valid is False
    assert any("below minimum of 60 words" in err for err in errors)


def test_dm_too_long(validator):
    """Test Instagram DM exceeding 30 words is flagged."""
    email = (
        "Hi Alex, I enjoyed your recent deep dive into Python FastAPI performance optimization. "
        "Your practical benchmarking of asynchronous request routing was exceptionally thorough and helpful. "
        "We are launching a new high-throughput telemetry service designed for backend engineers and would love "
        "to sponsor an upcoming tutorial or product walkthrough on your channel. Are you open to discussing "
        "a potential collaboration this month? Best, Sarah from the DevRel Team."
    )
    dm = "Hey Alex! Loved your latest video and the depth of your analysis. We are launching a new product and really think your audience of software engineers would love it. Let's schedule a call next week to talk through details!"

    response = PersonalizationResponse(
        content_summary="Tech tutorials",
        personalization_signals=["Signal 1"],
        collaboration_angle="Sponsorship",
        email_subject="Collaboration Inquiry",
        email=email,
        instagram_dm=dm,
    )

    is_valid, errors, email_words, dm_words = validator.validate_message(response)
    assert is_valid is False
    assert any("exceeds maximum of 30 words" in err for err in errors)


def test_placeholder_detection(validator):
    """Test detection of unfilled template placeholders."""
    email = (
        "Hi [Creator Name], I enjoyed your recent deep dive into Python FastAPI performance optimization. "
        "Your practical benchmarking was exceptionally thorough. We are launching {brand_name} designed for "
        "backend engineers and would love to sponsor an upcoming tutorial on your channel. Are you open to "
        "discussing a potential collaboration this month? Let me know! Best regards from [Your Name] at Company."
    )
    dm = "Hey [Creator Name]! Loved your tech tutorials. Would love to discuss a partnership with {brand}."

    response = PersonalizationResponse(
        content_summary="Tech tutorials",
        personalization_signals=["Signal 1"],
        collaboration_angle="Sponsorship",
        email_subject="Collaboration Inquiry",
        email=email,
        instagram_dm=dm,
    )

    is_valid, errors, email_words, dm_words = validator.validate_message(response)
    assert is_valid is False
    assert any("unfilled template placeholders" in err for err in errors)


def test_email_validator_syntax_and_placeholders():
    """Test app/utils/email_validator.py for syntax, domain format, and placeholder rejection."""
    from app.utils.email_validator import validate_email, is_valid_email

    # Valid emails
    assert is_valid_email("contact@alextech.io") is True
    status, clean = validate_email("  PARTNERSHIPS@CodeMaster.dev.co  ")
    assert status == "FOUND"
    assert clean == "partnerships@codemaster.dev.co"

    # Missing / None
    status, _ = validate_email(None)
    assert status == "NOT_FOUND"
    status, _ = validate_email("Not Found")
    assert status == "NOT_FOUND"

    # Placeholders & invalid domains
    status, _ = validate_email("yourname@example.com")
    assert status == "INVALID"
    status, _ = validate_email("user@domain.com")
    assert status == "INVALID"
    status, _ = validate_email("test@test.com")
    assert status == "INVALID"
    status, _ = validate_email("invalid-email-address")
    assert status == "INVALID"
    status, _ = validate_email("contact@site.png")  # invalid image extension
    assert status == "INVALID"
