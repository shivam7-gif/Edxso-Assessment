"""Pydantic schemas for Influencer profiles, discovery data, and scoring."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class VideoMetadata(BaseModel):
    """Schema for YouTube video data retrieved from the official API."""
    video_id: str
    title: str
    description: str = ""
    published_at: str = ""
    views: int = 0
    likes: int = 0
    comments: int = 0
    url: str = ""
    is_tech_relevant: Optional[bool] = None


class RawChannelData(BaseModel):
    """Raw YouTube channel data parsed from search and channels list API."""
    channel_id: str
    name: str
    description: str = ""
    custom_url: Optional[str] = None
    profile_url: str
    subscriber_count: int
    video_count: int = 0
    view_count: int = 0
    country: Optional[str] = None
    published_at: Optional[str] = None
    uploads_playlist_id: Optional[str] = None
    platform: str = "YouTube"


class ScoreBreakdown(BaseModel):
    """Component-level explainable score breakdown for brand fit."""
    follower_fit: float = Field(default=0.0, ge=0.0, le=25.0)
    tech_relevance: float = Field(default=0.0, ge=0.0, le=25.0)
    content_relevance: float = Field(default=0.0, ge=0.0, le=20.0)
    engagement_proxy: float = Field(default=0.0, ge=0.0, le=20.0)
    geo_relevance: float = Field(default=0.0, ge=0.0, le=10.0)
    total_score: float = Field(default=0.0, ge=0.0, le=100.0)
    technology_relevance_score: float = 0.0
    technology_video_ratio: float = 0.0
    status: Literal["QUALIFIED", "REVIEW", "REJECTED"] = "REJECTED"
    filter_reasons: List[str] = Field(default_factory=list)


class InfluencerProfile(BaseModel):
    """Complete enriched influencer profile schema."""
    id: Optional[int] = None
    platform: str = "YouTube"
    channel_id: str
    name: str
    profile_url: str
    followers: int
    average_views: float = 0.0
    average_likes: float = 0.0
    average_comments: float = 0.0
    engagement_rate: Optional[float] = None
    engagement_rate_type: str = "public_video_proxy"
    niche: str = "Technology"
    niche_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    technology_relevance_score: float = 0.0
    technology_relevance_reason: str = ""
    technology_video_ratio: float = 0.0
    content_themes: List[str] = Field(default_factory=list)
    email: str = "Not Found"
    email_source: str = "not_found"  # youtube_description, creator_website, contact_page, about_page, business_page, public_social_profile, not_found
    email_status: Literal["FOUND", "NOT_FOUND", "INVALID"] = "NOT_FOUND"
    website: Optional[str] = "Not Available"
    audience_age: str = "Not Available"
    audience_gender: str = "Not Available"
    audience_geography: str = "Not Available"
    brand_fit_score: float = 0.0
    status: Literal["QUALIFIED", "REVIEW", "REJECTED"] = "REJECTED"
    filter_reasons: List[str] = Field(default_factory=list)
    score_breakdown: Optional[ScoreBreakdown] = None
    recent_videos: List[VideoMetadata] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def contact_email(self) -> str:
        """Alias for email field."""
        return self.email

    @property
    def recent_content(self) -> List[VideoMetadata]:
        """Alias for recent_videos."""
        return self.recent_videos
