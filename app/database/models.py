"""SQLAlchemy ORM models for Influencers, Messages, and Outreach tracking."""

from datetime import datetime, timezone

def utc_now():
    return datetime.now(timezone.utc)

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class InfluencerModel(Base):
    """Database model for discovered and enriched influencers."""
    __tablename__ = "influencers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(50), nullable=False, default="YouTube", index=True)
    channel_id = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    profile_url = Column(String(500), nullable=False)
    
    # Metrics
    followers = Column(Integer, nullable=False, default=0, index=True)
    average_views = Column(Float, nullable=False, default=0.0)
    average_likes = Column(Float, nullable=False, default=0.0)
    average_comments = Column(Float, nullable=False, default=0.0)
    engagement_rate = Column(Float, nullable=True)
    engagement_rate_type = Column(String(50), nullable=False, default="public_video_proxy")
    
    # Classification & Themes
    niche = Column(String(100), nullable=False, default="Technology", index=True)
    niche_confidence = Column(Float, nullable=False, default=0.0)
    technology_relevance_score = Column(Float, nullable=False, default=0.0)
    technology_relevance_reason = Column(Text, nullable=False, default="")
    technology_video_ratio = Column(Float, nullable=False, default=0.0)
    content_themes = Column(JSON, nullable=False, default=list)
    
    # Enrichment
    email = Column(String(255), nullable=False, default="Not Found", index=True)
    email_source = Column(String(50), nullable=False, default="not_found")
    email_status = Column(String(50), nullable=False, default="NOT_FOUND", index=True)
    website = Column(String(500), nullable=True, default="Not Available")
    audience_age = Column(String(50), nullable=False, default="Not Available")
    audience_gender = Column(String(50), nullable=False, default="Not Available")
    audience_geography = Column(String(50), nullable=False, default="Not Available")
    
    # Filtering & Scoring
    brand_fit_score = Column(Float, nullable=False, default=0.0, index=True)
    status = Column(String(50), nullable=False, default="REJECTED", index=True)
    filter_reasons = Column(JSON, nullable=False, default=list)
    score_breakdown = Column(JSON, nullable=True)
    recent_videos = Column(JSON, nullable=False, default=list)
    
    # Timestamps
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    messages = relationship("MessageModel", back_populates="influencer", cascade="all, delete-orphan")
    outreach_records = relationship("OutreachModel", back_populates="influencer", cascade="all, delete-orphan")

    @property
    def contact_email(self) -> str:
        """Alias for email column."""
        return self.email

    @property
    def recent_content(self) -> list:
        """Alias for recent_videos."""
        return self.recent_videos or []

    def __repr__(self) -> str:
        return f"<Influencer(id={self.id}, name='{self.name}', status='{self.status}', score={self.brand_fit_score}, tech_score={self.technology_relevance_score})>"


class MessageModel(Base):
    """Database model for personalized outreach messages generated via LLM."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    email_subject = Column(String(255), nullable=False)
    email_body = Column(Text, nullable=False)
    instagram_dm = Column(Text, nullable=False)
    collaboration_angle = Column(String(255), nullable=False)
    personalization_signals = Column(JSON, nullable=False, default=list)
    
    model = Column(String(100), nullable=False)
    validation_status = Column(String(50), nullable=False, default="VALID", index=True)
    validation_errors = Column(JSON, nullable=False, default=list)
    email_word_count = Column(Integer, nullable=False, default=0)
    dm_word_count = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    influencer = relationship("InfluencerModel", back_populates="messages")
    outreach = relationship("OutreachModel", back_populates="message", uselist=False)

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, influencer_id={self.influencer_id}, status='{self.validation_status}')>"


class OutreachModel(Base):
    """Database model for tracking outreach delivery and simulation events."""
    __tablename__ = "outreach"

    id = Column(Integer, primary_key=True, autoincrement=True)
    influencer_id = Column(Integer, ForeignKey("influencers.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(50), nullable=False, default="SIMULATED", index=True)  # SIMULATED, SENT, SKIPPED, FAILED
    send_mode = Column(String(50), nullable=False, default="simulation")           # simulation, smtp
    sent_at = Column(DateTime, default=utc_now, nullable=False)
    error_message = Column(Text, nullable=True)

    # Relationships
    influencer = relationship("InfluencerModel", back_populates="outreach_records")
    message = relationship("MessageModel", back_populates="outreach")

    __table_args__ = (
        Index("ix_outreach_influencer_status", "influencer_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Outreach(id={self.id}, influencer_id={self.influencer_id}, status='{self.status}', mode='{self.send_mode}')>"
