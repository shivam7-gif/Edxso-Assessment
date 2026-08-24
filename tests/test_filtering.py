"""Unit tests for deterministic technology niche classification and false-positive prevention."""

import pytest
from app.filtering.classifier import NicheClassifier
from app.schemas.influencer import RawChannelData, VideoMetadata


@pytest.fixture
def classifier():
    return NicheClassifier()


def test_ai_classification(classifier):
    """Test identifying an AI-focused channel from video titles and description."""
    channel = RawChannelData(
        channel_id="UC_AI_1",
        name="AI Innovations Hub",
        description="Exploring ChatGPT, Claude, and generative AI agents for automation.",
        profile_url="https://youtube.com/aihub",
        subscriber_count=28000,
    )
    videos = [
        VideoMetadata(video_id="v1", title="Top 5 LLM Tools in 2026", description="Prompt engineering and agentic workflows"),
        VideoMetadata(video_id="v2", title="Claude vs ChatGPT Coding Benchmark", description="Testing LLM coding capabilities"),
    ]

    score, reason, ratio, niche, confidence, keywords = classifier.calculate_relevance(channel, videos)
    assert "AI" in niche
    assert score >= 70.0
    assert ratio == 1.0
    assert "technology" in reason.lower() or "ai" in reason.lower()
    assert any("ai" in kw or "claude" in kw or "chatgpt" in kw or "llm" in kw for kw in keywords)


def test_programming_classification(classifier):
    """Test classifying a Python/Web dev programming channel."""
    channel = RawChannelData(
        channel_id="UC_PY_1",
        name="Python Mastery",
        description="Learn Python, Django, FastAPI and modern web development tutorials.",
        profile_url="https://youtube.com/pythonmastery",
        subscriber_count=42000,
    )
    videos = [
        VideoMetadata(video_id="v1", title="Build a FastAPI REST API from Scratch", description="Python backend tutorial"),
        VideoMetadata(video_id="v2", title="Async JavaScript & TypeScript Tutorial", description="Frontend coding guide"),
    ]

    score, reason, ratio, niche, confidence, keywords = classifier.calculate_relevance(channel, videos)
    assert niche == "Programming"
    assert score >= 70.0
    assert ratio == 1.0
    assert "Python" in keywords or "fastapi" in keywords or "programming" in keywords


def test_cybersecurity_classification(classifier):
    """Test classifying ethical hacking & infosec channel."""
    channel = RawChannelData(
        channel_id="UC_SEC_1",
        name="InfoSec Hacker Lab",
        description="Ethical hacking, Kali Linux, bug bounty, and penetration testing tutorials.",
        profile_url="https://youtube.com/infoseclab",
        subscriber_count=19000,
    )
    videos = [
        VideoMetadata(video_id="v1", title="Kali Linux Wi-Fi Penetration Testing", description="Network security tutorial"),
    ]

    score, reason, ratio, niche, confidence, keywords = classifier.calculate_relevance(channel, videos)
    assert niche == "Cybersecurity"
    assert score >= 60.0
    assert ratio == 1.0


def test_reject_comedy_false_positives(classifier):
    """Test that comedy channels (e.g. BOYS COMEDY. 612, Gajendra Puri Comedy, Avinash Agarwal Comedy) are not classified as Technology."""
    comedy_channels = [
        RawChannelData(
            channel_id="UC_COMEDY_1",
            name="BOYS COMEDY. 612",
            description="Comedy videos and funny pranks daily! Subscribe for comedy sketches.",
            profile_url="https://youtube.com/boyscomedy",
            subscriber_count=35000,
        ),
        RawChannelData(
            channel_id="UC_COMEDY_2",
            name="Gajendra Puri Comedy",
            description="Hello, I'm Gajendra, a stand up comedian. This channel is dedicated to stand up comedy videos.",
            profile_url="https://youtube.com/gajendrapuri",
            subscriber_count=7920,
        ),
        RawChannelData(
            channel_id="UC_COMEDY_3",
            name="Avinash Agarwal Comedy",
            description="Stand up comedy sketches, funny roasts, and jokes.",
            profile_url="https://youtube.com/avinashcomedy",
            subscriber_count=81600,
        ),
        RawChannelData(
            channel_id="UC_COMEDY_4",
            name="Engineer Comedy",
            description="Engineer Comedy Only subscribe Our YouTube Channel",
            profile_url="https://youtube.com/engineercomedy",
            subscriber_count=41600,
        ),
    ]

    for ch in comedy_channels:
        comedy_videos = [
            VideoMetadata(video_id="c1", title="Funniest Prank on Friends (Comedy Roast)"),
            VideoMetadata(video_id="c2", title="Standup Comedy Special Live"),
        ]
        score, reason, ratio, niche, confidence, keywords = classifier.calculate_relevance(ch, comedy_videos)
        
        # Must have low tech score
        assert score < 30.0, f"Channel '{ch.name}' received too high tech score: {score}"
        # Ratio must be 0
        assert ratio == 0.0
        # Reason must clearly identify comedy/entertainment
        assert "comedy" in reason.lower() or "entertainment" in reason.lower()
        assert niche == "Comedy & Entertainment"


def test_reject_vlogs_and_lifestyle(classifier):
    """Test that generic daily vlogs are not classified as technology."""
    channel = RawChannelData(
        channel_id="UC_GENERIC",
        name="Daily Vlogs & Life",
        description="Just sharing my daily life, cooking, and shopping vlogs.",
        profile_url="https://youtube.com/vlogs",
        subscriber_count=15000,
    )
    videos = [
        VideoMetadata(video_id="v1", title="What I Eat in a Day"),
        VideoMetadata(video_id="v2", title="Weekend Travel Vlog"),
    ]
    score, reason, ratio, niche, confidence, keywords = classifier.calculate_relevance(channel, videos)
    assert score < 20.0
    assert ratio == 0.0
    assert "lacks" in reason.lower() or "insufficient" in reason.lower()
