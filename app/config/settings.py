"""Application configuration settings using Pydantic Settings."""

import os
from functools import lru_cache
from typing import Literal, Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Explicitly load .env file
load_dotenv(override=True)


class Settings(BaseSettings):
    """Global configuration settings for the Influencer Outreach pipeline."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys
    YOUTUBE_API_KEY: str = Field(
        default="",
        description="YouTube Data API v3 key for discovery and video metrics",
    )
    GROQ_API_KEY: str = Field(
        default="",
        description="Groq API key for LLM personalization",
    )

    # LLM Settings
    GROQ_MODEL: str = Field(
        default="openai/gpt-oss-120b",
        description="Groq model ID for personalization (e.g., openai/gpt-oss-120b)",
    )

    # Outreach Settings
    SEND_MODE: Literal["simulation", "smtp"] = Field(
        default="simulation",
        description="Outreach sending mode: simulation (default, safe) or smtp (live email delivery)",
    )

    # SMTP Configuration (required only if SEND_MODE is 'smtp')
    SMTP_HOST: Optional[str] = Field(default=None, description="SMTP server host")
    SMTP_PORT: int = Field(default=587, description="SMTP server port (e.g. 587 for STARTTLS)")
    SMTP_USERNAME: Optional[str] = Field(default=None, description="SMTP username / email")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP password / app password")
    SMTP_FROM_EMAIL: Optional[str] = Field(default=None, description="From email address for outreach")

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///data/influencers.db",
        description="SQLAlchemy database connection URL",
    )

    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_RAW_DIR: str = os.path.join(BASE_DIR, "data", "raw")
    DATA_PROCESSED_DIR: str = os.path.join(BASE_DIR, "data", "processed")
    DATA_EXPORTS_DIR: str = os.path.join(BASE_DIR, "data", "exports")

    # Filtering Criteria
    MIN_SUBSCRIBERS: int = 5_000
    MAX_SUBSCRIBERS: int = 100_000
    RECENT_VIDEOS_LIMIT: int = 8
    DISCOVERY_TARGET_MIN: int = 50
    DISCOVERY_CANDIDATE_TARGET: int = 120
    TECH_VIDEO_RATIO_THRESHOLD: float = 0.40
    MAX_PAGES_PER_WEBSITE: int = 4

    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging verbosity level")

    def validate_youtube_key(self) -> bool:
        """Check if YouTube API key is configured."""
        return bool(self.YOUTUBE_API_KEY and self.YOUTUBE_API_KEY.strip() and not self.YOUTUBE_API_KEY.startswith("your_"))

    def validate_groq_key(self) -> bool:
        """Check if Groq API key is configured."""
        return bool(self.GROQ_API_KEY and self.GROQ_API_KEY.strip() and not self.GROQ_API_KEY.startswith("your_"))

    def validate_smtp_config(self) -> tuple[bool, str]:
        """Validate SMTP parameters when SMTP mode is selected."""
        if not self.SMTP_HOST:
            return False, "SMTP_HOST is not configured."
        if not self.SMTP_USERNAME:
            return False, "SMTP_USERNAME is not configured."
        if not self.SMTP_PASSWORD:
            return False, "SMTP_PASSWORD is not configured."
        if not self.SMTP_FROM_EMAIL:
            return False, "SMTP_FROM_EMAIL is not configured."
        return True, "SMTP configuration is valid."


@lru_cache()
def get_settings() -> Settings:
    """Returns cached instance of the application settings."""
    return Settings()
