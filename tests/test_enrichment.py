"""Unit tests for profile enrichment, multi-source email extraction, website crawling, themes, and engagement proxy."""

import pytest
from unittest.mock import patch, MagicMock
from app.enrichment.email import EmailExtractor
from app.enrichment.website import WebsiteEmailExtractor
from app.enrichment.content import ContentThemeExtractor
from app.enrichment.profile import ProfileEnricher
from app.schemas.influencer import RawChannelData, VideoMetadata


@pytest.fixture
def email_extractor():
    return EmailExtractor()


@pytest.fixture
def website_extractor():
    return WebsiteEmailExtractor()


@pytest.fixture
def theme_extractor():
    return ContentThemeExtractor()


@pytest.fixture
def profile_enricher():
    return ProfileEnricher()


def test_email_extraction_from_description(email_extractor):
    """Test extracting clear public business emails."""
    desc = "Welcome to my channel! For business inquiries and sponsorships contact: partnerships@techtutorials.io or visit my site."
    email, source = email_extractor.extract_from_description(desc)
    assert email == "partnerships@techtutorials.io"
    assert source == "youtube_description"


def test_deobfuscated_email_extraction(email_extractor):
    """Test extracting obfuscated email formats like name [at] domain [dot] com."""
    desc = "For collabs: alex.dev [at] gmail [dot] com | Follow me on Twitter."
    email, source = email_extractor.extract_from_description(desc)
    assert email == "alex.dev@gmail.com"
    assert source == "youtube_description"


def test_missing_email_strictly_not_found(email_extractor):
    """Test when no email exists, system returns 'Not Found' without guessing."""
    desc = "Check out my coding tutorials and subscribe! New videos every Tuesday and Thursday."
    email, source = email_extractor.extract_from_description(desc)
    assert email == "Not Found"
    assert source == "not_found"


def test_website_url_extraction_filters_socials(website_extractor):
    """Test extracting public creator website while ignoring social and media links."""
    desc = (
        "Check my official website https://alextech.io/projects "
        "and follow me on https://instagram.com/alextech "
        "and https://twitter.com/alextech or discord https://discord.gg/abc"
    )
    urls = website_extractor.extract_website_urls(desc)
    assert len(urls) == 1
    assert urls[0] == "https://alextech.io"


def test_website_contact_page_email_discovery(website_extractor):
    """Test crawling creator website contact page extracts email properly."""
    mock_resp_home = MagicMock()
    mock_resp_home.status_code = 200
    mock_resp_home.headers = {"Content-Type": "text/html"}
    mock_resp_home.text = "<html><body><h1>Alex Tech</h1><p>Welcome to my site</p></body></html>"

    mock_resp_contact = MagicMock()
    mock_resp_contact.status_code = 200
    mock_resp_contact.headers = {"Content-Type": "text/html"}
    mock_resp_contact.text = (
        "<html><body><h1>Contact Me</h1>"
        "<p>For business inquiries: <a href='mailto:business@alextech.io'>business@alextech.io</a></p></body></html>"
    )

    with patch.object(website_extractor.session, "get") as mock_get:
        mock_get.side_effect = [mock_resp_home, mock_resp_contact]
        email, source = website_extractor.discover_email_from_website("https://alextech.io")
        assert email == "business@alextech.io"
        assert source == "contact_page"


def test_multi_source_enrichment_flow(email_extractor):
    """Test complete multi-source email discovery flow from description to website."""
    desc = "Hi, check out my official portfolio at https://coderjohn.com for collaborations."
    
    with patch.object(email_extractor.website_extractor, "discover_email_from_website") as mock_discover:
        mock_discover.return_value = ("john@coderjohn.com", "creator_website")
        email, source, status, site = email_extractor.enrich_email_multi_source(desc)
        assert email == "john@coderjohn.com"
        assert source == "creator_website"
        assert status == "FOUND"
        assert site == "https://coderjohn.com"


def test_content_theme_extraction(theme_extractor):
    """Test extracting 2-5 salient themes from video titles."""
    videos = [
        VideoMetadata(video_id="1", title="Mastering Python FastAPI & Async Postgres"),
        VideoMetadata(video_id="2", title="Building AI Agents with LangChain & OpenAI"),
        VideoMetadata(video_id="3", title="System Design: Microservices Architecture Patterns"),
        VideoMetadata(video_id="4", title="5 AI Tools That Will Double Your Coding Speed"),
    ]
    themes = theme_extractor.extract_themes(videos, default_niche="Technology")
    assert 2 <= len(themes) <= 5
    assert any("AI" in t or "Python" in t or "System Design" in t or "Web" in t for t in themes)


def test_engagement_rate_proxy_calculation(profile_enricher):
    """Test formula: average(likes + comments) / subscribers * 100."""
    videos = [
        VideoMetadata(video_id="1", title="Video 1", views=10000, likes=500, comments=50),
        VideoMetadata(video_id="2", title="Video 2", views=8000, likes=350, comments=40),
    ]
    subscriber_count = 20000

    # Video 1: 550 interactions. Video 2: 390 interactions. Avg interactions = 470.
    # Engagement rate = (470 / 20000) * 100 = 2.35%
    eng_rate, rate_type, avg_views, avg_likes, avg_comments = profile_enricher.calculate_engagement_proxy(
        videos=videos,
        subscriber_count=subscriber_count,
    )

    assert eng_rate == 2.35
    assert rate_type == "public_video_proxy"
    assert avg_views == 9000.0
    assert avg_likes == 425.0
    assert avg_comments == 45.0


def test_engagement_rate_unavailable_when_no_videos(profile_enricher):
    """Test engagement rate is marked unavailable when no videos exist."""
    eng_rate, rate_type, avg_views, avg_likes, avg_comments = profile_enricher.calculate_engagement_proxy(
        videos=[],
        subscriber_count=20000,
    )
    assert eng_rate is None
    assert rate_type == "Not Available"
