"""100-point brand-fit scoring engine and qualification classifier."""

from typing import List, Tuple, Optional
from app.config.settings import get_settings
from app.schemas.influencer import RawChannelData, VideoMetadata, ScoreBreakdown
from app.utils.logging import get_logger

logger = get_logger("filtering.scoring")

# Tier-1 global technology development hubs & active tech consumer markets
TIER_1_COUNTRIES = {"US", "GB", "CA", "AU", "IN", "DE", "FR", "NL", "SG", "JP", "SE", "IL"}


class BrandFitScorer:
    """Calculates an explainable 100-point score across 5 core dimensions and determines qualification status."""

    def __init__(self):
        settings = get_settings()
        self.video_ratio_threshold = getattr(settings, "TECH_VIDEO_RATIO_THRESHOLD", 0.40)

    def calculate_score(
        self,
        channel: RawChannelData,
        niche: str,
        niche_confidence: float,
        engagement_rate: Optional[float],
        recent_videos: Optional[List[VideoMetadata]] = None,
        technology_relevance_score: Optional[float] = None,
        technology_video_ratio: Optional[float] = None,
    ) -> Tuple[float, str, ScoreBreakdown, List[str]]:
        """Compute 100-point score breakdown, qualification status, and filter reasons."""
        recent_videos = recent_videos or []
        filter_reasons: List[str] = []

        # Derive tech score & ratio if not passed
        if technology_relevance_score is None:
            tech_rel = round(niche_confidence * 100.0, 1)
        else:
            tech_rel = technology_relevance_score

        if technology_video_ratio is None:
            if recent_videos:
                tech_vids = [v for v in recent_videos if getattr(v, "is_tech_relevant", True)]
                video_ratio = round(len(tech_vids) / len(recent_videos), 2)
            else:
                video_ratio = 0.0
        else:
            video_ratio = technology_video_ratio

        # 1. Follower Fit (25 Points)
        # Micro-influencer standard range: 5,000 - 100,000
        follower_score = 0.0
        subs = channel.subscriber_count

        if 10_000 <= subs <= 50_000:
            follower_score = 25.0
        elif (5_000 <= subs < 10_000) or (50_000 < subs <= 100_000):
            follower_score = 20.0
        elif subs < 5_000:
            follower_score = 0.0
            filter_reasons.append(f"Subscriber count ({subs:,}) below micro-influencer minimum (5,000)")
        else:
            follower_score = 0.0
            filter_reasons.append(f"Subscriber count ({subs:,}) exceeds micro-influencer threshold (100,000)")

        # 2. Technology Relevance (25 Points)
        tech_score = round((tech_rel / 100.0) * 25.0, 1)
        if tech_rel < 45.0:
            filter_reasons.append(f"Low technology relevance score ({tech_rel}/100) for '{niche}'")

        # 3. Content Relevance & Recent-Content Evidence (20 Points)
        content_score = 0.0
        if recent_videos:
            if video_ratio >= 0.60 and len(recent_videos) >= 4:
                content_score = 20.0
            elif video_ratio >= self.video_ratio_threshold and len(recent_videos) >= 2:
                content_score = 15.0
            elif video_ratio > 0.0:
                content_score = 10.0
            else:
                content_score = 0.0
                filter_reasons.append(f"No technology-relevant recent uploads found in {len(recent_videos)} analyzed videos")

            if len(recent_videos) >= 2 and video_ratio < self.video_ratio_threshold:
                filter_reasons.append(
                    f"Technology video ratio ({video_ratio:.0%}) below minimum requirement ({self.video_ratio_threshold:.0%})"
                )
        else:
            content_score = 5.0
            filter_reasons.append("Insufficient recent videos available to establish content frequency")

        # 4. Engagement Proxy (20 Points)
        engagement_score = 0.0
        if engagement_rate is not None:
            if engagement_rate >= 3.0:
                engagement_score = 20.0
            elif engagement_rate >= 1.5:
                engagement_score = 16.0
            elif engagement_rate >= 0.5:
                engagement_score = 12.0
            elif engagement_rate > 0.0:
                engagement_score = 6.0
            else:
                engagement_score = 2.0
        else:
            engagement_score = 0.0
            filter_reasons.append("Engagement rate proxy unavailable (insufficient public metrics)")

        # 5. Geographic Relevance (10 Points)
        geo_score = 0.0
        if channel.country:
            if channel.country.upper() in TIER_1_COUNTRIES:
                geo_score = 10.0
            else:
                geo_score = 7.0
        else:
            geo_score = 5.0

        total_score = round(follower_score + tech_score + content_score + engagement_score + geo_score, 1)

        # Qualification Thresholds (Strictly independent of email availability)
        meets_video_evidence = (len(recent_videos) == 0 or video_ratio >= self.video_ratio_threshold)
        
        if total_score >= 70.0 and follower_score > 0 and tech_rel >= 50.0 and meets_video_evidence:
            status = "QUALIFIED"
        elif total_score >= 50.0 and follower_score > 0 and tech_rel >= 35.0:
            status = "REVIEW"
            if not filter_reasons:
                filter_reasons.append(f"Borderline score ({total_score}/100) requires manual review")
        else:
            status = "REJECTED"
            if not filter_reasons:
                filter_reasons.append(f"Overall brand-fit score ({total_score}/100) below qualification minimum")

        breakdown = ScoreBreakdown(
            follower_fit=follower_score,
            tech_relevance=tech_score,
            content_relevance=content_score,
            engagement_proxy=engagement_score,
            geo_relevance=geo_score,
            total_score=total_score,
            technology_relevance_score=tech_rel,
            technology_video_ratio=video_ratio,
            status=status,
            filter_reasons=filter_reasons,
        )

        return total_score, status, breakdown, filter_reasons
