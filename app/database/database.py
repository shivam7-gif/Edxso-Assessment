"""Database connection management and session utilities."""

import os
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config.settings import get_settings
from app.database.models import Base
from app.utils.logging import get_logger

logger = get_logger("database")

_engine = None
_SessionFactory = None


def get_engine():
    """Create or return the cached SQLAlchemy engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = settings.DATABASE_URL
        
        # Ensure target directory exists for SQLite
        if db_url.startswith("sqlite:///"):
            db_path = db_url.replace("sqlite:///", "")
            db_dir = os.path.dirname(db_path)
            if db_dir and not os.path.exists(db_dir):
                os.makedirs(db_dir, exist_ok=True)
                
        _engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
            echo=False,
        )
        # Ensure schema and column migrations are applied
        init_db()
    return _engine


def get_session_factory():
    """Create or return the cached sessionmaker."""
    global _SessionFactory
    if _SessionFactory is None:
        engine = get_engine()
        _SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionFactory


def SessionLocal() -> Session:
    """Instantiate a new database session."""
    factory = get_session_factory()
    return factory()


def init_db() -> None:
    """Initialize database tables and ensure all model columns exist."""
    engine = get_engine()
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Automatic schema migration for SQLite columns
    settings = get_settings()
    if "sqlite" in settings.DATABASE_URL:
        try:
            with engine.connect() as conn:
                from sqlalchemy import text
                # Get existing columns in influencers table
                res = conn.execute(text("PRAGMA table_info(influencers);"))
                existing_cols = {row[1] for row in res.fetchall()}
                
                col_defs = {
                    "technology_relevance_score": "FLOAT DEFAULT 0.0",
                    "technology_relevance_reason": "TEXT DEFAULT ''",
                    "technology_video_ratio": "FLOAT DEFAULT 0.0",
                    "email_status": "VARCHAR(50) DEFAULT 'NOT_FOUND'",
                }
                for col_name, col_type in col_defs.items():
                    if existing_cols and col_name not in existing_cols:
                        logger.info(f"Adding missing column {col_name} to influencers table...")
                        conn.execute(text(f"ALTER TABLE influencers ADD COLUMN {col_name} {col_type};"))
                conn.commit()
        except Exception as e:
            logger.debug(f"Schema migration note: {e}")

    logger.info("Database schema initialized successfully.")


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """Context manager for safe database transactions."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database transaction rolled back due to error: {e}")
        raise
    finally:
        session.close()
