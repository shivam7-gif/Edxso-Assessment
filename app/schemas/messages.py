"""Pydantic schemas for AI personalization, validation, and outreach."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class VideoContext(BaseModel):
    """Brief video context for LLM prompt payload."""
    title: str
    published_at: Optional[str] = ""
    views: int = 0


class PersonalizationRequest(BaseModel):
    """Structured context sent to Groq for personalization."""
    name: str
    platform: str = "YouTube"
    followers: int
    niche: str
    content_themes: List[str] = Field(default_factory=list)
    recent_videos: List[VideoContext] = Field(default_factory=list)
    brand_fit_score: float = 0.0


class PersonalizationResponse(BaseModel):
    """Structured output expected from Groq LLM inference."""
    content_summary: str = Field(
        description="Factual 1-2 sentence summary of creator's recent video themes"
    )
    personalization_signals: List[str] = Field(
        description="2-3 specific signals extracted from real video titles"
    )
    collaboration_angle: str = Field(
        description="Dynamic collaboration format (e.g. sponsorship, developer tooling showcase, affiliate)"
    )
    email_subject: str = Field(
        description="Compelling, personalized email subject line"
    )
    email: str = Field(
        description="Personalized email pitch strictly between 60 and 90 words"
    )
    instagram_dm: str = Field(
        description="Concise Instagram direct message strictly between 15 and 30 words"
    )


class ValidatedMessage(BaseModel):
    """Message object after running full validation suite."""
    id: Optional[int] = None
    influencer_id: int
    influencer_name: Optional[str] = None
    email_subject: str
    email_body: str
    instagram_dm: str
    collaboration_angle: str
    personalization_signals: List[str] = Field(default_factory=list)
    model: str
    validation_status: Literal["VALID", "MANUAL_REVIEW"] = "VALID"
    validation_errors: List[str] = Field(default_factory=list)
    email_word_count: int = 0
    dm_word_count: int = 0
    dm_status: str = "READY_FOR_MANUAL_SEND"
    created_at: Optional[datetime] = None


class OutreachRecord(BaseModel):
    """Schema representing an outreach event or simulation."""
    id: Optional[int] = None
    influencer_id: int
    influencer_name: Optional[str] = None
    email: str
    message_id: Optional[int] = None
    status: Literal["SIMULATED", "SENT", "SKIPPED", "FAILED"] = "SIMULATED"
    send_mode: Literal["simulation", "smtp"] = "simulation"
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
