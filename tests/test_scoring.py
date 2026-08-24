"""Unit tests for 100-point brand-fit scoring, technology relevance, and qualification thresholds."""

import pytest
from app.filtering.scoring import BrandFitScorer
from app.schemas.influencer import RawChannelData, VideoMetadata


@pytest.fixture
def scorer():
    return BrandFitScorer()


def test_qualified_creator_scoring(scorer):
    """Test a high-relevance tech creator qualifies with score >= 70."""
    channel = RawChannelData(
        channel_id="UC_HIGH_QUAL",
        name="Developer Tech Insights",
        profile_url="https://youtube.com/devinsights",
        subscriber_count=35000,
        country="US",
    )
    videos = [
        VideoMetadata(video_id=f"v{i}", title=f"Modern Developer Tooling Tutorial #{i}", views=5000)
        for i in range(5)
    ]
    # Tech score 88.0, video ratio 1.0, Engagement 2.8%
    score, status, breakdown, filter_reasons = scorer.calculate_score(
        channel=channel,
        niche="Developer Tools",
        niche_confidence=0.90,
        engagement_rate=2.8,
        recent_videos=videos,
        technology_relevance_score=88.0,
        technology_video_ratio=1.0,
    )

    assert status == "QUALIFIED"
    assert score >= 70.0
    assert breakdown.follower_fit == 25.0
    assert breakdown.technology_relevance_score == 88.0
    assert breakdown.technology_video_ratio == 1.0


def test_qualification_does_not_require_email(scorer):
    """Test that qualification is based on brand-fit and tech content evidence, NOT email presence."""
    channel = RawChannelData(
        channel_id="UC_NO_EMAIL",
        name="Rust & Go Systems",
        description="Systems programming in Rust and Go without public email.",
        profile_url="https://youtube.com/rustsystems",
        subscriber_count=22000,
        country="CA",
    )
    videos = [
        VideoMetadata(video_id="v1", title="Building High-Performance Microservices in Go"),
        VideoMetadata(video_id="v2", title="Async Rust Architecture"),
        VideoMetadata(video_id="v3", title="Linux Kernel Modules with Rust"),
    ]

    score, status, breakdown, filter_reasons = scorer.calculate_score(
        channel=channel,
        niche="Programming",
        niche_confidence=0.95,
        engagement_rate=3.2,
        recent_videos=videos,
        technology_relevance_score=92.0,
        technology_video_ratio=1.0,
    )

    # Must be QUALIFIED even if no email is attached
    assert status == "QUALIFIED"
    assert score >= 75.0


def test_disqualified_when_video_ratio_below_threshold(scorer):
    """Test that when recent uploads have insufficient tech content (< 40%), creator cannot qualify."""
    channel = RawChannelData(
        channel_id="UC_POOR_RATIO",
        name="Techy Name But Comedy Content",
        profile_url="https://youtube.com/mixed",
        subscriber_count=30000,
        country="US",
    )
    videos = [
        VideoMetadata(video_id="v1", title="Funny Prank on Roommates"),
        VideoMetadata(video_id="v2", title="Reaction to Viral Video"),
        VideoMetadata(video_id="v3", title="My Weekend Vlog"),
        VideoMetadata(video_id="v4", title="One Tech Gadget Review"),
        VideoMetadata(video_id="v5", title="Cooking with Friends"),
    ]
    # Ratio = 1/5 = 0.20 (below 0.40)
    score, status, breakdown, filter_reasons = scorer.calculate_score(
        channel=channel,
        niche="Consumer Technology",
        niche_confidence=0.40,
        engagement_rate=2.0,
        recent_videos=videos,
        technology_relevance_score=35.0,
        technology_video_ratio=0.20,
    )

    assert status != "QUALIFIED"
    assert any("ratio" in r.lower() or "minimum" in r.lower() for r in filter_reasons)


def test_rejected_below_subscriber_minimum(scorer):
    """Test channel with subscriber count below 5,000 gets rejected with clear filter reason."""
    channel = RawChannelData(
        channel_id="UC_TOO_SMALL",
        name="Tiny Coding",
        profile_url="https://youtube.com/tinycoding",
        subscriber_count=2100,  # Below 5,000
    )
    score, status, breakdown, filter_reasons = scorer.calculate_score(
        channel=channel,
        niche="Programming",
        niche_confidence=0.85,
        engagement_rate=3.5,
        recent_videos=[],
        technology_relevance_score=85.0,
        technology_video_ratio=1.0,
    )

    assert status == "REJECTED"
    assert breakdown.follower_fit == 0.0
    assert any("below micro-influencer minimum" in r for r in filter_reasons)


def test_rejected_above_subscriber_maximum(scorer):
    """Test channel with subscriber count above 100,000 gets rejected with clear filter reason."""
    channel = RawChannelData(
        channel_id="UC_TOO_BIG",
        name="Giant Tech Reviews",
        profile_url="https://youtube.com/gianttech",
        subscriber_count=450000,  # Above 100,000
    )
    score, status, breakdown, filter_reasons = scorer.calculate_score(
        channel=channel,
        niche="Consumer Tech & Gadgets",
        niche_confidence=0.95,
        engagement_rate=1.8,
        recent_videos=[],
        technology_relevance_score=90.0,
        technology_video_ratio=1.0,
    )

    assert status == "REJECTED"
    assert breakdown.follower_fit == 0.0
    assert any("exceeds micro-influencer threshold" in r for r in filter_reasons)
