"""FastAPI REST API routes for CreatorFlow AI CRM frontend."""

import os
import json
import threading
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.database.database import get_db
from app.database.models import InfluencerModel, MessageModel, OutreachModel
from app.schemas.influencer import InfluencerProfile, VideoMetadata
from app.pipeline.orchestrator import PipelineOrchestrator
from app.personalization.groq import GroqPersonalizationService
from app.utils.logging import get_logger

logger = get_logger("api.routes")
router = APIRouter(prefix="/api")

# In-memory background job tracker for live discovery streaming/polling
active_job_state: Dict[str, Any] = {
    "status": "idle",
    "job_type": None,
    "progress": 0,
    "total": 0,
    "current_step": "Idle",
    "steps": [
        {"id": "connect", "label": "Connecting to YouTube API", "status": "pending"},
        {"id": "search", "label": "Searching niche creators", "status": "pending"},
        {"id": "metrics", "label": "Collecting channel metrics", "status": "pending"},
        {"id": "videos", "label": "Collecting recent videos", "status": "pending"},
        {"id": "classify", "label": "Classifying creators", "status": "pending"},
        {"id": "enrich", "label": "Enriching profiles & emails", "status": "pending"},
        {"id": "score", "label": "Calculating brand fit scores", "status": "pending"},
        {"id": "personalize", "label": "Generating AI email pitches", "status": "pending"},
    ],
    "discovered_creators": [],
    "error": None,
    "completed_at": None,
}


# ==========================================
# PYDANTIC SCHEMAS FOR API REQUESTS / RESPONSES
# ==========================================
class DiscoveryRequest(BaseModel):
    niche: str = Field(default="all", description="Target niche (e.g. Comedy, Fitness, Tech, Gaming, AI, etc.)")
    keywords: Optional[List[str]] = Field(default=None, description="Custom keywords")
    min_followers: int = Field(default=5000, ge=1000)
    max_followers: int = Field(default=100000, le=500000)
    target_count: int = Field(default=85, ge=5, le=200)
    wipe_first: bool = Field(default=False)


class MessageUpdateRequest(BaseModel):
    email_subject: Optional[str] = None
    email_body: Optional[str] = None
    instagram_dm: Optional[str] = None
    validation_status: Optional[str] = None


class PipelineRunRequest(BaseModel):
    niche: str = "all"
    target_count: int = 85
    outreach_mode: str = "simulation"
    wipe_first: bool = False


# ==========================================
# 1. HEALTH & SYSTEM DIAGNOSTICS
# ==========================================
@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": "CreatorFlow AI",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/settings")
def get_system_settings():
    settings = get_settings()
    yt_configured = bool(settings.YOUTUBE_API_KEY and not settings.YOUTUBE_API_KEY.startswith("your_"))
    groq_configured = bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_"))
    smtp_configured = bool(settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD)

    with get_db() as session:
        inf_count = session.query(InfluencerModel).count()
        msg_count = session.query(MessageModel).count()
        out_count = session.query(OutreachModel).count()

    return {
        "youtube_api": {
            "status": "connected" if yt_configured else "missing_key",
            "key_masked": f"{settings.YOUTUBE_API_KEY[:6]}...{settings.YOUTUBE_API_KEY[-4:]}" if yt_configured else "Not Configured",
        },
        "groq_api": {
            "status": "connected" if groq_configured else "missing_key",
            "model": settings.GROQ_MODEL,
            "key_masked": f"{settings.GROQ_API_KEY[:6]}...{settings.GROQ_API_KEY[-4:]}" if groq_configured else "Not Configured",
        },
        "outreach": {
            "send_mode": settings.SEND_MODE,
            "smtp_configured": smtp_configured,
            "smtp_host": settings.SMTP_HOST or "Not Configured",
            "smtp_from": settings.SMTP_FROM_EMAIL or "Not Configured",
        },
        "database": {
            "url": settings.DATABASE_URL,
            "influencer_count": inf_count,
            "message_count": msg_count,
            "outreach_count": out_count,
        },
        "subscriber_bounds": {
            "min": settings.MIN_SUBSCRIBERS,
            "max": settings.MAX_SUBSCRIBERS,
        },
    }


# ==========================================
# 2. ANALYTICS & EXECUTIVE KPIS
# ==========================================
@router.get("/analytics")
def get_analytics():
    """Calculate and return real-time executive KPIs, funnel stages, and activity feed."""
    with get_db() as session:
        influencers = session.query(InfluencerModel).all()
        messages = session.query(MessageModel).all()
        outreach_records = session.query(OutreachModel).all()

        total_discovered = len(influencers)
        qualified_infs = [i for i in influencers if i.status == "QUALIFIED"]
        review_infs = [i for i in influencers if i.status == "REVIEW"]
        rejected_infs = [i for i in influencers if i.status == "REJECTED"]

        qualified_count = len(qualified_infs)
        emails_found_count = len([i for i in influencers if i.email and i.email != "Not Found"])
        emails_qualified_count = len([i for i in qualified_infs if i.email and i.email != "Not Found"])

        messages_count = len(messages)
        valid_messages_count = len([m for m in messages if m.validation_status == "VALID"])

        outreach_sent_count = len([o for o in outreach_records if o.status in ("SENT", "SIMULATED")])
        outreach_simulated_count = len([o for o in outreach_records if o.status == "SIMULATED"])
        outreach_live_sent_count = len([o for o in outreach_records if o.status == "SENT"])

        avg_followers = int(sum(i.followers for i in influencers) / total_discovered) if total_discovered > 0 else 0
        avg_score = round(sum(i.brand_fit_score for i in influencers) / total_discovered, 1) if total_discovered > 0 else 0.0

        valid_engs = [i.engagement_rate for i in influencers if i.engagement_rate is not None]
        avg_eng = round(sum(valid_engs) / len(valid_engs), 2) if valid_engs else 0.0

        # Funnel counts
        funnel = {
            "discovered": total_discovered,
            "qualified": qualified_count,
            "enriched": emails_found_count,
            "personalized": messages_count,
            "ready_for_outreach": emails_qualified_count,
            "sent": outreach_sent_count,
            "replied": 0,
        }

        # Niche breakdown
        niche_map: Dict[str, int] = {}
        for i in influencers:
            n = i.niche or "General"
            niche_map[n] = niche_map.get(n, 0) + 1

        # Email sources breakdown
        email_sources_map = {
            "YouTube description": len([i for i in influencers if i.email_source == "youtube_description"]),
            "Creator website": len([i for i in influencers if i.email_source == "creator_website"]),
            "Contact page": len([i for i in influencers if i.email_source in ("contact_page", "about_page", "business_page")]),
            "Public social profile": len([i for i in influencers if i.email_source == "public_social_profile"]),
            "Not found": len([i for i in influencers if i.email_source == "not_found" or i.email == "Not Found"]),
        }

        # Follower distribution brackets
        follower_brackets = {
            "5k - 15k": len([i for i in influencers if 5000 <= i.followers < 15000]),
            "15k - 35k": len([i for i in influencers if 15000 <= i.followers < 35000]),
            "35k - 70k": len([i for i in influencers if 35000 <= i.followers < 70000]),
            "70k - 100k": len([i for i in influencers if 70000 <= i.followers <= 100000]),
        }

        # Activity Feed
        activities = []
        # Add recent messages
        for m in messages[:6]:
            inf = next((i for i in influencers if i.id == m.influencer_id), None)
            name = inf.name if inf else f"Creator #{m.influencer_id}"
            activities.append({
                "id": f"msg-{m.id}",
                "type": "personalization",
                "title": f"AI personalization generated for {name}",
                "timestamp": m.created_at.isoformat() if m.created_at else datetime.now(timezone.utc).isoformat(),
                "status": m.validation_status,
                "detail": f"{m.email_word_count} words email, {m.dm_word_count} words DM",
            })

        # Add recent qualified creators
        for i in qualified_infs[:4]:
            activities.append({
                "id": f"inf-{i.id}",
                "type": "qualified",
                "title": f"Creator {i.name} qualified with score {i.brand_fit_score}/100",
                "timestamp": i.updated_at.isoformat() if i.updated_at else datetime.now(timezone.utc).isoformat(),
                "status": "QUALIFIED",
                "detail": f"Niche: {i.niche} ({i.followers:,} followers)",
            })

        # Add outreach event
        if outreach_sent_count > 0:
            activities.append({
                "id": "out-batch",
                "type": "outreach",
                "title": f"Outreach simulation processed for {outreach_sent_count} creators",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "COMPLETED",
                "detail": "Safe simulation mode (zero duplicates)",
            })

    return {
        "kpis": {
            "total_discovered": total_discovered,
            "qualified_count": qualified_count,
            "qualification_rate": round((qualified_count / total_discovered) * 100, 1) if total_discovered > 0 else 0,
            "emails_found_count": emails_found_count,
            "emails_rate": round((emails_found_count / total_discovered) * 100, 1) if total_discovered > 0 else 0,
            "email_coverage_rate": round((emails_found_count / total_discovered) * 100, 1) if total_discovered > 0 else 0,
            "messages_count": messages_count,
            "messages_validated_rate": round((valid_messages_count / messages_count) * 100, 1) if messages_count > 0 else 0,
            "outreach_sent_count": outreach_sent_count,
            "outreach_simulated_count": outreach_simulated_count,
            "outreach_live_sent_count": outreach_live_sent_count,
            "avg_followers": avg_followers,
            "avg_score": avg_score,
            "avg_engagement_proxy": avg_eng,
            "response_rate": 0.0,
        },
        "funnel": funnel,
        "niche_breakdown": niche_map,
        "email_sources": email_sources_map,
        "follower_brackets": follower_brackets,
        "recent_activities": activities,
    }


# ==========================================
# 3. INFLUENCERS (CRM TABLE & DETAIL DRAWER)
# ==========================================
@router.get("/influencers")
def get_influencers(
    search: Optional[str] = None,
    niche: Optional[str] = None,
    status: Optional[str] = None,
    email_only: bool = False,
    min_followers: Optional[int] = None,
    max_followers: Optional[int] = None,
    sort_by: str = "brand_fit_score",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """Retrieve filtered, sorted, and paginated list of influencers."""
    with get_db() as session:
        query = session.query(InfluencerModel)

        if search and search.strip():
            s = f"%{search.strip()}%"
            query = query.filter((InfluencerModel.name.ilike(s)) | (InfluencerModel.niche.ilike(s)))

        if niche and niche.strip() and niche.lower() != "all":
            query = query.filter(InfluencerModel.niche.ilike(f"%{niche.strip()}%"))

        if status and status.strip() and status.lower() != "all":
            query = query.filter(InfluencerModel.status == status.strip().upper())

        if email_only:
            query = query.filter(InfluencerModel.email != "Not Found")

        if min_followers is not None:
            query = query.filter(InfluencerModel.followers >= min_followers)

        if max_followers is not None:
            query = query.filter(InfluencerModel.followers <= max_followers)

        # Sorting
        sort_column = getattr(InfluencerModel, sort_by, InfluencerModel.brand_fit_score)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        total = query.count()
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        # Build detailed responses
        results = []
        for i in items:
            results.append({
                "id": i.id,
                "name": i.name,
                "platform": i.platform,
                "channel_id": i.channel_id,
                "profile_url": i.profile_url,
                "followers": i.followers,
                "avg_views": i.average_views,
                "avg_likes": i.average_likes,
                "avg_comments": i.average_comments,
                "engagement_rate": i.engagement_rate,
                "engagement_rate_type": i.engagement_rate_type,
                "niche": i.niche,
                "niche_confidence": i.niche_confidence,
                "technology_relevance_score": i.technology_relevance_score,
                "technology_relevance_reason": i.technology_relevance_reason,
                "technology_video_ratio": i.technology_video_ratio,
                "content_themes": i.content_themes or [],
                "email": i.email,
                "contact_email": i.email,
                "email_source": i.email_source,
                "email_status": i.email_status,
                "website": i.website or "Not Available",
                "audience_geography": i.audience_geography or "Not Available",
                "brand_fit_score": i.brand_fit_score,
                "status": i.status,
                "filter_reasons": i.filter_reasons or [],
                "score_breakdown": i.score_breakdown or {},
                "recent_videos_count": len(i.recent_videos or []),
                "updated_at": i.updated_at.isoformat() if i.updated_at else None,
            })

        return {
            "items": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if total > 0 else 1,
        }


@router.get("/influencers/{influencer_id}")
def get_influencer_detail(influencer_id: int):
    """Retrieve complete creator detail including recent videos, score breakdown, and message status."""
    with get_db() as session:
        inf = session.query(InfluencerModel).filter(InfluencerModel.id == influencer_id).first()
        if not inf:
            raise HTTPException(status_code=404, detail="Influencer not found")

        msg = session.query(MessageModel).filter(MessageModel.influencer_id == influencer_id).first()
        out = session.query(OutreachModel).filter(OutreachModel.influencer_id == influencer_id).first()

        return {
            "id": inf.id,
            "name": inf.name,
            "platform": inf.platform,
            "channel_id": inf.channel_id,
            "profile_url": inf.profile_url,
            "followers": inf.followers,
            "avg_views": inf.average_views,
            "avg_likes": inf.average_likes,
            "avg_comments": inf.average_comments,
            "engagement_rate": inf.engagement_rate,
            "engagement_rate_type": inf.engagement_rate_type,
            "niche": inf.niche,
            "niche_confidence": inf.niche_confidence,
            "technology_relevance_score": inf.technology_relevance_score,
            "technology_relevance_reason": inf.technology_relevance_reason,
            "technology_video_ratio": inf.technology_video_ratio,
            "content_themes": inf.content_themes or [],
            "email": inf.email,
            "contact_email": inf.email,
            "email_source": inf.email_source,
            "email_status": inf.email_status,
            "website": inf.website or "Not Available",
            "audience_age": inf.audience_age or "Not Available",
            "audience_gender": inf.audience_gender or "Not Available",
            "audience_geography": inf.audience_geography or "Not Available",
            "brand_fit_score": inf.brand_fit_score,
            "status": inf.status,
            "filter_reasons": inf.filter_reasons or [],
            "score_breakdown": inf.score_breakdown or {},
            "recent_videos": inf.recent_videos or [],
            "created_at": inf.created_at.isoformat() if inf.created_at else None,
            "message": {
                "id": msg.id,
                "email_subject": msg.email_subject,
                "email_body": msg.email_body,
                "instagram_dm": msg.instagram_dm,
                "collaboration_angle": msg.collaboration_angle,
                "personalization_signals": msg.personalization_signals or [],
                "model": msg.model,
                "validation_status": msg.validation_status,
                "email_word_count": msg.email_word_count,
                "dm_word_count": msg.dm_word_count,
            } if msg else None,
            "outreach": {
                "id": out.id,
                "status": out.status,
                "send_mode": out.send_mode,
                "sent_at": out.sent_at.isoformat() if out.sent_at else None,
                "error_message": out.error_message,
            } if out else None,
        }


# ==========================================
# 4. AI PERSONALIZATION & MESSAGES WORKSPACE
# ==========================================
@router.get("/messages")
def get_all_messages():
    """Retrieve all personalized messages with creator context."""
    with get_db() as session:
        msgs = session.query(MessageModel).all()
        results = []
        for m in msgs:
            inf = session.query(InfluencerModel).filter(InfluencerModel.id == m.influencer_id).first()
            results.append({
                "id": m.id,
                "influencer_id": m.influencer_id,
                "creator_name": inf.name if inf else "Unknown",
                "creator_email": inf.email if inf else "Not Found",
                "creator_niche": inf.niche if inf else "General",
                "creator_followers": inf.followers if inf else 0,
                "creator_score": inf.brand_fit_score if inf else 0,
                "email_subject": m.email_subject,
                "email_body": m.email_body,
                "instagram_dm": m.instagram_dm,
                "collaboration_angle": m.collaboration_angle,
                "personalization_signals": m.personalization_signals or [],
                "model": m.model,
                "validation_status": m.validation_status,
                "validation_errors": m.validation_errors or [],
                "email_word_count": m.email_word_count,
                "dm_word_count": m.dm_word_count,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            })
        return {"items": results, "total": len(results)}


@router.post("/personalization/{influencer_id}/regenerate")
def regenerate_personalization(influencer_id: int):
    """Regenerate AI personalization for a specific creator using Groq."""
    with get_db() as session:
        inf = session.query(InfluencerModel).filter(InfluencerModel.id == influencer_id).first()
        if not inf:
            raise HTTPException(status_code=404, detail="Influencer not found")

        # Convert to schema
        profile = InfluencerProfile(
            id=inf.id,
            platform=inf.platform,
            channel_id=inf.channel_id,
            name=inf.name,
            profile_url=inf.profile_url,
            followers=inf.followers,
            average_views=inf.average_views,
            average_likes=inf.average_likes,
            average_comments=inf.average_comments,
            engagement_rate=inf.engagement_rate,
            engagement_rate_type=inf.engagement_rate_type,
            niche=inf.niche,
            niche_confidence=inf.niche_confidence,
            content_themes=inf.content_themes or [],
            email=inf.email,
            email_source=inf.email_source,
            brand_fit_score=inf.brand_fit_score,
            status=inf.status,
            recent_videos=inf.recent_videos or [],
        )

        service = GroqPersonalizationService()
        validated_msg = service.personalize_creator(profile)

        # Update or create
        existing_msg = session.query(MessageModel).filter(MessageModel.influencer_id == inf.id).first()
        if existing_msg:
            existing_msg.email_subject = validated_msg.email_subject
            existing_msg.email_body = validated_msg.email_body
            existing_msg.instagram_dm = validated_msg.instagram_dm
            existing_msg.collaboration_angle = validated_msg.collaboration_angle
            existing_msg.personalization_signals = validated_msg.personalization_signals
            existing_msg.model = validated_msg.model
            existing_msg.validation_status = validated_msg.validation_status
            existing_msg.validation_errors = validated_msg.validation_errors
            existing_msg.email_word_count = validated_msg.email_word_count
            existing_msg.dm_word_count = validated_msg.dm_word_count
            session.commit()
            msg_id = existing_msg.id
        else:
            new_msg = MessageModel(
                influencer_id=inf.id,
                email_subject=validated_msg.email_subject,
                email_body=validated_msg.email_body,
                instagram_dm=validated_msg.instagram_dm,
                collaboration_angle=validated_msg.collaboration_angle,
                personalization_signals=validated_msg.personalization_signals,
                model=validated_msg.model,
                validation_status=validated_msg.validation_status,
                validation_errors=validated_msg.validation_errors,
                email_word_count=validated_msg.email_word_count,
                dm_word_count=validated_msg.dm_word_count,
            )
            session.add(new_msg)
            session.commit()
            msg_id = new_msg.id

        return {
            "success": True,
            "message_id": msg_id,
            "email_subject": validated_msg.email_subject,
            "email_body": validated_msg.email_body,
            "instagram_dm": validated_msg.instagram_dm,
            "email_word_count": validated_msg.email_word_count,
            "dm_word_count": validated_msg.dm_word_count,
            "validation_status": validated_msg.validation_status,
            "model": validated_msg.model,
        }


@router.put("/personalization/{influencer_id}")
def update_message(influencer_id: int, req: MessageUpdateRequest):
    """Save manual edits to email subject, body, or Instagram DM."""
    with get_db() as session:
        msg = session.query(MessageModel).filter(MessageModel.influencer_id == influencer_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")

        if req.email_subject is not None:
            msg.email_subject = req.email_subject
        if req.email_body is not None:
            msg.email_body = req.email_body
            msg.email_word_count = len(req.email_body.split())
        if req.instagram_dm is not None:
            msg.instagram_dm = req.instagram_dm
            msg.dm_word_count = len(req.instagram_dm.split())
        if req.validation_status is not None:
            msg.validation_status = req.validation_status

        session.commit()
        return {"success": True, "message_id": msg.id}


@router.post("/personalization/{influencer_id}/approve")
def approve_message(influencer_id: int):
    """Mark a message as manually approved and ready for dispatch."""
    with get_db() as session:
        msg = session.query(MessageModel).filter(MessageModel.influencer_id == influencer_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        msg.validation_status = "APPROVED"
        session.commit()
        return {"success": True, "status": "APPROVED"}


# ==========================================
# 5. DISCOVERY WORKSPACE & BACKGROUND JOB STREAM
# ==========================================
def _run_discovery_job(niche: str, target_count: int, wipe_first: bool):
    """Background worker for live discovery tracking."""
    global active_job_state
    orchestrator = PipelineOrchestrator()
    
    try:
        active_job_state["status"] = "running"
        active_job_state["job_type"] = "discovery"
        active_job_state["progress"] = 10
        active_job_state["total"] = target_count
        active_job_state["current_step"] = f"Connecting to YouTube API for niche '{niche}'..."
        active_job_state["steps"][0]["status"] = "in_progress"

        if wipe_first:
            orchestrator.clear_database()

        active_job_state["steps"][0]["status"] = "completed"
        active_job_state["steps"][1]["status"] = "in_progress"
        active_job_state["current_step"] = f"Searching YouTube creators in '{niche}'..."
        active_job_state["progress"] = 30

        raw_channels = orchestrator.discover_and_collect(target_count=target_count, custom_niche=niche)
        active_job_state["steps"][1]["status"] = "completed"
        active_job_state["steps"][2]["status"] = "completed"
        active_job_state["steps"][3]["status"] = "in_progress"
        active_job_state["current_step"] = f"Collecting recent videos for {len(raw_channels)} candidates..."
        active_job_state["progress"] = 55

        # Classify & enrich
        active_job_state["steps"][3]["status"] = "completed"
        active_job_state["steps"][4]["status"] = "in_progress"
        active_job_state["steps"][5]["status"] = "in_progress"
        active_job_state["steps"][6]["status"] = "in_progress"
        active_job_state["current_step"] = "Classifying, enriching, and scoring brand-fit..."
        active_job_state["progress"] = 80

        saved = orchestrator.filter_and_enrich_channels(raw_channels, target_niche=niche)

        active_job_state["steps"][4]["status"] = "completed"
        active_job_state["steps"][5]["status"] = "completed"
        active_job_state["steps"][6]["status"] = "completed"
        active_job_state["steps"][7]["status"] = "in_progress"
        active_job_state["current_step"] = "Generating AI personalized email pitches via Groq LLM..."
        active_job_state["progress"] = 90

        messages = orchestrator.personalize_qualified(target_niche=niche)
        orchestrator.export_csvs()

        active_job_state["steps"][7]["status"] = "completed"
        active_job_state["status"] = "completed"
        active_job_state["progress"] = 100
        active_job_state["current_step"] = f"Successfully discovered {len(saved)} creators & generated {len(messages)} AI pitches!"
        active_job_state["completed_at"] = datetime.now(timezone.utc).isoformat()
        active_job_state["discovered_creators"] = [
            {"id": s.id, "name": s.name, "subs": s.followers, "niche": s.niche, "score": s.brand_fit_score, "email": s.email}
            for s in saved[:15]
        ]
    except Exception as e:
        logger.exception(f"Discovery job error: {e}")
        active_job_state["status"] = "error"
        active_job_state["error"] = str(e)


@router.post("/personalization/batch")
def generate_batch_personalization(niche: Optional[str] = None):
    """Generate AI personalization for all qualified creators."""
    orchestrator = PipelineOrchestrator()
    messages = orchestrator.personalize_qualified(target_niche=niche)
    orchestrator.export_csvs()
    return {"success": True, "count": len(messages), "message": f"Generated {len(messages)} AI pitches successfully."}


@router.post("/discovery")
def start_discovery(req: DiscoveryRequest, background_tasks: BackgroundTasks):
    """Trigger background YouTube creator discovery across any target niche."""
    global active_job_state
    if active_job_state["status"] == "running":
        return {"status": "already_running", "message": "A discovery run is already in progress"}

    active_job_state["status"] = "starting"
    active_job_state["error"] = None
    background_tasks.add_task(_run_discovery_job, req.niche, req.target_count, req.wipe_first)
    return {"status": "started", "niche": req.niche, "target_count": req.target_count}


@router.get("/discovery/status")
def get_discovery_status():
    """Poll live progress state of the active or most recent discovery run."""
    return active_job_state


# ==========================================
# 6. OUTREACH & DISPATCH TRACKING
# ==========================================
@router.get("/outreach")
def get_outreach_records():
    """Retrieve all outreach records and audit timelines."""
    with get_db() as session:
        records = session.query(OutreachModel).all()
        results = []
        for r in records:
            inf = session.query(InfluencerModel).filter(InfluencerModel.id == r.influencer_id).first()
            msg = session.query(MessageModel).filter(MessageModel.id == r.message_id).first() if r.message_id else None
            results.append({
                "id": r.id,
                "influencer_id": r.influencer_id,
                "creator_name": inf.name if inf else "Unknown",
                "creator_email": r.email,
                "creator_niche": inf.niche if inf else "General",
                "creator_followers": inf.followers if inf else 0,
                "status": r.status,
                "send_mode": r.send_mode,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                "error_message": r.error_message,
                "message_subject": msg.email_subject if msg else "N/A",
                "message_preview": msg.email_body[:100] + "..." if msg and msg.email_body else "N/A",
            })
        return {"items": results, "total": len(results)}


@router.post("/outreach/simulate-all")
def simulate_all_outreach():
    """Simulate outreach for all qualified creators with verified emails."""
    orchestrator = PipelineOrchestrator()
    res = orchestrator.execute_outreach(mode="simulation")
    return {"success": True, "results": res}


@router.post("/outreach/{influencer_id}/send")
def send_single_outreach(influencer_id: int):
    """Send or simulate outreach for a single creator."""
    with get_db() as session:
        inf = session.query(InfluencerModel).filter(InfluencerModel.id == influencer_id).first()
        if not inf:
            raise HTTPException(status_code=404, detail="Influencer not found")

        msg = session.query(MessageModel).filter(MessageModel.influencer_id == influencer_id).first()
        if not msg:
            raise HTTPException(status_code=400, detail="Personalization message not generated yet")

        if inf.email == "Not Found":
            raise HTTPException(status_code=400, detail="Cannot dispatch outreach: verified email is Not Found")

        orchestrator = PipelineOrchestrator()
        send_mode = orchestrator.settings.SEND_MODE

        out = session.query(OutreachModel).filter(OutreachModel.influencer_id == influencer_id).first()
        if not out:
            out = OutreachModel(
                influencer_id=inf.id,
                email=inf.email,
                message_id=msg.id,
                status="SIMULATED" if send_mode == "simulation" else "SENT",
                send_mode=send_mode,
                sent_at=datetime.now(timezone.utc),
            )
            session.add(out)
        else:
            out.status = "SIMULATED" if send_mode == "simulation" else "SENT"
            out.sent_at = datetime.now(timezone.utc)

        session.commit()
        return {"success": True, "status": out.status, "send_mode": send_mode}


# ==========================================
# 7. CAMPAIGNS MANAGEMENT
# ==========================================
@router.get("/campaigns")
def get_campaigns():
    """Retrieve active influencer outreach campaigns."""
    with get_db() as session:
        infs = session.query(InfluencerModel).all()
        msgs = session.query(MessageModel).all()
        outs = session.query(OutreachModel).all()

        total = len(infs)
        msg_count = len(msgs)
        sent_count = len([o for o in outs if o.status in ("SENT", "SIMULATED")])

        # Group by primary niches into virtual campaigns
        campaigns = [
            {
                "id": "camp-tech-2026",
                "name": "Global Tech & Developer Outreach",
                "target_niche": "Technology & Software Engineering",
                "audience": "Developers & Engineers (5k-100k)",
                "creators_count": len([i for i in infs if "Tech" in (i.niche or "") or "Program" in (i.niche or "") or "AI" in (i.niche or "") or "Dev" in (i.niche or "")]),
                "messages_count": msg_count,
                "sent_count": sent_count,
                "responses_count": 0,
                "status": "Active",
                "created_at": "2026-08-24T08:00:00Z",
            },
            {
                "id": "camp-ai-tools",
                "name": "AI & LLM Tooling Showcase",
                "target_niche": "AI & Machine Learning",
                "audience": "AI Creators & Prompt Engineers",
                "creators_count": len([i for i in infs if "AI" in (i.niche or "") or "Machine" in (i.niche or "")]),
                "messages_count": len([m for m in msgs if "AI" in (m.collaboration_angle or "")]),
                "sent_count": len([o for o in outs if o.status in ("SENT", "SIMULATED")]),
                "responses_count": 0,
                "status": "Active",
                "created_at": "2026-08-24T10:00:00Z",
            },
            {
                "id": "camp-comedy-ent",
                "name": "Creative & Entertainment Micro-Influencers",
                "target_niche": "Comedy & Entertainment",
                "audience": "Creative Creators & Comedians",
                "creators_count": len([i for i in infs if "Comedy" in (i.niche or "") or "Entertainment" in (i.niche or "")]),
                "messages_count": 0,
                "sent_count": 0,
                "responses_count": 0,
                "status": "Draft",
                "created_at": "2026-08-24T12:00:00Z",
            }
        ]
        return {"campaigns": campaigns}


# ==========================================
# 8. PIPELINE RUN & DATABASE ACTIONS
# ==========================================
@router.post("/pipeline/run")
def run_pipeline(req: PipelineRunRequest):
    """Run full 7-stage pipeline synchronously or return summary."""
    orchestrator = PipelineOrchestrator()
    if req.wipe_first:
        orchestrator.clear_database()

    summary = orchestrator.run_full_pipeline(
        target_count=req.target_count,
        outreach_mode=req.outreach_mode,
        target_niche=req.niche,
    )
    return {"success": True, "summary": summary}


@router.post("/database/clear")
def clear_database():
    """Wipe database and reset discovery state for clean run."""
    orchestrator = PipelineOrchestrator()
    orchestrator.clear_database()
    return {"success": True, "message": "Database and caches cleared successfully"}


# ==========================================
# 9. CSV EXPORTS
# ==========================================
@router.get("/exports/{filename}")
def download_export_csv(filename: str):
    """Serve exported CSV files."""
    if filename not in ("influencers.csv", "messages.csv", "outreach.csv"):
        raise HTTPException(status_code=400, detail="Invalid export filename")

    path = os.path.join("data", "exports", filename)
    if not os.path.exists(path):
        # Generate on the fly
        PipelineOrchestrator().export_csvs()

    if os.path.exists(path):
        return FileResponse(path, media_type="text/csv", filename=filename)
    raise HTTPException(status_code=404, detail="File not found")
