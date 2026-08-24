"""Assembles full enriched influencer profiles from raw discovery, video metrics, and multi-source email crawling."""

from typing import List, Optional
from app.schemas.influencer import RawChannelData, VideoMetadata, InfluencerProfile
from app.enrichment.email import EmailExtractor
from app.enrichment.content import ContentThemeExtractor
from app.filtering.classifier import NicheClassifier
from app.filtering.scoring import BrandFitScorer
from app.utils.logging import get_logger

logger = get_logger("enrichment.profile")


class ProfileEnricher:
    """Enriches raw channel information with engagement metrics, technology relevance scoring, multi-source email discovery, and brand fit qualification."""

    def __init__(self):
        self.email_extractor = EmailExtractor()
        self.theme_extractor = ContentThemeExtractor()
        self.classifier = NicheClassifier()
        self.scorer = BrandFitScorer()

    def calculate_engagement_proxy(
        self,
        videos: List[VideoMetadata],
        subscriber_count: int,
    ) -> tuple[Optional[float], str, float, float, float]:
        """Calculate public video engagement rate proxy.
        
        Formula:
        average(likes + comments) / subscriber_count * 100
        """
        if not videos or subscriber_count <= 0:
            return None, "Not Available", 0.0, 0.0, 0.0

        total_views = sum(v.views for v in videos)
        total_likes = sum(v.likes for v in videos)
        total_comments = sum(v.comments for v in videos)
        n = len(videos)

        avg_views = round(total_views / n, 1)
        avg_likes = round(total_likes / n, 1)
        avg_comments = round(total_comments / n, 1)

        avg_interactions = avg_likes + avg_comments
        if avg_interactions > 0:
            engagement_rate = round((avg_interactions / subscriber_count) * 100.0, 2)
            rate_type = "public_video_proxy"
        else:
            engagement_rate = 0.0
            rate_type = "public_video_proxy"

        return engagement_rate, rate_type, avg_views, avg_likes, avg_comments

    def enrich(
        self,
        channel: RawChannelData,
        recent_videos: Optional[List[VideoMetadata]] = None,
        target_niche: Optional[str] = None,
    ) -> InfluencerProfile:
        """Execute complete enrichment pipeline for a single creator."""
        videos = recent_videos or []

        # 1. Multi-signal technology relevance & niche classification
        tech_rel_score, tech_rel_reason, tech_vid_ratio, niche, confidence, keywords = self.classifier.calculate_relevance(
            channel=channel, recent_videos=videos
        )

        # 2. Multi-source email enrichment & validation (YouTube description + public website/contact pages)
        email, email_source, email_status, discovered_website = self.email_extractor.enrich_email_multi_source(
            description=channel.description, custom_url=channel.custom_url
        )

        website = discovered_website or channel.custom_url or "Not Available"

        # 3. Content themes
        themes = self.theme_extractor.extract_themes(videos, default_niche=niche)

        # 4. Engagement rate proxy calculation
        eng_rate, rate_type, avg_views, avg_likes, avg_comments = self.calculate_engagement_proxy(
            videos, channel.subscriber_count
        )

        # 5. Brand-fit scoring (100-point rubric with video evidence ratio gating)
        score, status, breakdown, filter_reasons = self.scorer.calculate_score(
            channel=channel,
            niche=niche,
            niche_confidence=confidence,
            engagement_rate=eng_rate,
            recent_videos=videos,
            technology_relevance_score=tech_rel_score,
            technology_video_ratio=tech_vid_ratio,
        )

        return InfluencerProfile(
            platform="YouTube",
            channel_id=channel.channel_id,
            name=channel.name,
            profile_url=channel.profile_url,
            followers=channel.subscriber_count,
            average_views=avg_views,
            average_likes=avg_likes,
            average_comments=avg_comments,
            engagement_rate=eng_rate,
            engagement_rate_type=rate_type,
            niche=niche,
            niche_confidence=confidence,
            technology_relevance_score=tech_rel_score,
            technology_relevance_reason=tech_rel_reason,
            technology_video_ratio=tech_vid_ratio,
            content_themes=themes,
            email=email,
            email_source=email_source,
            email_status=email_status,
            website=website,
            audience_age="Not Available",
            audience_gender="Not Available",
            audience_geography=channel.country or "Not Available",
            brand_fit_score=score,
            status=status,
            filter_reasons=filter_reasons,
            score_breakdown=breakdown,
            recent_videos=videos,
        )
