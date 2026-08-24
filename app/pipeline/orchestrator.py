"""End-to-end pipeline orchestrator for discovery, filtering, enrichment, personalization, and outreach."""

import os
import json
from typing import List, Dict, Any, Optional
import pandas as pd
from datetime import datetime

from app.config.settings import get_settings
from app.database.database import get_db, init_db
from app.database.models import InfluencerModel, MessageModel, OutreachModel
from app.discovery.youtube import YouTubeDiscoveryService
from app.enrichment.profile import ProfileEnricher
from app.personalization.groq import GroqPersonalizationService
from app.outreach.simulator import OutreachSimulator
from app.outreach.smtp import SMTPEmailDispatcher
from app.schemas.influencer import RawChannelData, InfluencerProfile
from app.utils.logging import get_logger, console

logger = get_logger("pipeline.orchestrator")


class PipelineOrchestrator:
    """Coordinates all 7 pipeline stages with logging, database synchronization, and CSV exports."""

    def __init__(self):
        self.settings = get_settings()
        self.discovery_service = YouTubeDiscoveryService()
        self.enricher = ProfileEnricher()
        self.personalization_service = GroqPersonalizationService()
        self.simulator = OutreachSimulator()
        self.smtp_dispatcher = SMTPEmailDispatcher()
        init_db()

    def clear_database(self) -> None:
        """Wipe previous database records and cached raw files for a clean fresh run."""
        with get_db() as session:
            session.query(OutreachModel).delete()
            session.query(MessageModel).delete()
            session.query(InfluencerModel).delete()
            session.commit()
        
        # Remove cached raw discovery if exists
        cache_path = os.path.join(self.settings.DATA_RAW_DIR, "discovered_channels_raw.json")
        if os.path.exists(cache_path):
            try:
                os.remove(cache_path)
            except Exception as e:
                logger.warning(f"Could not remove old raw cache: {e}")
        logger.info("Database and discovery cache successfully cleared.")

    def discover_and_collect(self, target_count: int = 80, custom_niche: Optional[str] = None) -> List[RawChannelData]:
        """Stage 1 & 2: Discover channels and collect recent videos."""
        channels = self.discovery_service.discover_creators(target_count=target_count, custom_niche=custom_niche)
        return channels

    def filter_and_enrich_channels(
        self,
        raw_channels: Optional[List[RawChannelData]] = None,
        target_niche: Optional[str] = None,
    ) -> List[InfluencerModel]:
        """Stage 3 & 4: Classify, score, enrich, and persist influencers to SQLite."""
        settings = self.settings
        if raw_channels is None:
            # Check if we have cached raw discovery
            cache_path = os.path.join(settings.DATA_RAW_DIR, "discovered_channels_raw.json")
            if os.path.exists(cache_path):
                with open(cache_path, "r", encoding="utf-8") as f:
                    raw_dict = json.load(f)
                    raw_channels = [RawChannelData.model_validate(item) for item in raw_dict]
            else:
                raw_channels = self.discover_and_collect(target_count=settings.DISCOVERY_CANDIDATE_TARGET, custom_niche=target_niche)

        # Filter by custom niche if requested by user
        if target_niche and target_niche.strip().lower() != "all":
            niche_lower = target_niche.strip().lower()
            # Prioritize channels mentioning target niche
            raw_channels = [
                c for c in raw_channels 
                if niche_lower in c.name.lower() or niche_lower in c.description.lower() or niche_lower in (c.custom_url or "").lower()
            ] or raw_channels

        saved_influencer_models: List[InfluencerModel] = []

        with get_db() as session:
            for idx, channel in enumerate(raw_channels, start=1):
                # Retrieve recent videos for each candidate
                try:
                    recent_videos = self.discovery_service.fetch_recent_videos(
                        channel, max_videos=settings.RECENT_VIDEOS_LIMIT
                    )
                except Exception as e:
                    logger.warning(f"Failed to fetch recent videos for {channel.name}: {e}")
                    recent_videos = []

                # Enrich & score profile
                profile = self.enricher.enrich(channel, recent_videos, target_niche=target_niche)

                # Real-time accountability output
                status_color = "green" if profile.status == "QUALIFIED" else ("yellow" if profile.status == "REVIEW" else "red")
                console.print(
                    f"        [bold cyan]•[/bold cyan] [bold]{profile.name}[/bold] | Niche: [magenta]{profile.niche}[/magenta] | Subs: {profile.followers:,} | "
                    f"Score: [bold]{profile.brand_fit_score}/100[/bold] [{status_color}]{profile.status}[/{status_color}] | Email: [cyan]{profile.email}[/cyan]"
                )

                # Persist or update in database
                existing = (
                    session.query(InfluencerModel)
                    .filter(InfluencerModel.channel_id == profile.channel_id)
                    .first()
                )
                if existing:
                    existing.name = profile.name
                    existing.profile_url = profile.profile_url
                    existing.followers = profile.followers
                    existing.average_views = profile.average_views
                    existing.average_likes = profile.average_likes
                    existing.average_comments = profile.average_comments
                    existing.engagement_rate = profile.engagement_rate
                    existing.engagement_rate_type = profile.engagement_rate_type
                    existing.niche = profile.niche
                    existing.niche_confidence = profile.niche_confidence
                    existing.technology_relevance_score = profile.technology_relevance_score
                    existing.technology_relevance_reason = profile.technology_relevance_reason
                    existing.technology_video_ratio = profile.technology_video_ratio
                    existing.content_themes = profile.content_themes
                    existing.email = profile.email
                    existing.email_source = profile.email_source
                    existing.email_status = profile.email_status
                    existing.website = profile.website
                    existing.audience_geography = profile.audience_geography
                    existing.brand_fit_score = profile.brand_fit_score
                    existing.status = profile.status
                    existing.filter_reasons = profile.filter_reasons
                    existing.score_breakdown = profile.score_breakdown.model_dump() if profile.score_breakdown else {}
                    existing.recent_videos = [v.model_dump() for v in profile.recent_videos]
                    saved_influencer_models.append(existing)
                else:
                    new_inf = InfluencerModel(
                        platform=profile.platform,
                        channel_id=profile.channel_id,
                        name=profile.name,
                        profile_url=profile.profile_url,
                        followers=profile.followers,
                        average_views=profile.average_views,
                        average_likes=profile.average_likes,
                        average_comments=profile.average_comments,
                        engagement_rate=profile.engagement_rate,
                        engagement_rate_type=profile.engagement_rate_type,
                        niche=profile.niche,
                        niche_confidence=profile.niche_confidence,
                        technology_relevance_score=profile.technology_relevance_score,
                        technology_relevance_reason=profile.technology_relevance_reason,
                        technology_video_ratio=profile.technology_video_ratio,
                        content_themes=profile.content_themes,
                        email=profile.email,
                        email_source=profile.email_source,
                        email_status=profile.email_status,
                        website=profile.website,
                        audience_age=profile.audience_age,
                        audience_gender=profile.audience_gender,
                        audience_geography=profile.audience_geography,
                        brand_fit_score=profile.brand_fit_score,
                        status=profile.status,
                        filter_reasons=profile.filter_reasons,
                        score_breakdown=profile.score_breakdown.model_dump() if profile.score_breakdown else {},
                        recent_videos=[v.model_dump() for v in profile.recent_videos],
                    )
                    session.add(new_inf)
                    saved_influencer_models.append(new_inf)

            session.flush()

        return saved_influencer_models

    def personalize_qualified(self, target_niche: Optional[str] = None) -> List[MessageModel]:
        """Stage 5 & 6: Generate and validate AI personalized messages for QUALIFIED creators."""
        saved_messages: List[MessageModel] = []

        with get_db() as session:
            query = session.query(InfluencerModel).filter(InfluencerModel.status == "QUALIFIED")
            if target_niche and target_niche.strip().lower() != "all":
                query = query.filter(InfluencerModel.niche.ilike(f"%{target_niche.strip()}%"))
            qualified = query.all()

            for inf in qualified:
                # Convert DB model to profile schema
                profile_schema = InfluencerProfile(
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

                # Check if message already generated
                existing_msg = (
                    session.query(MessageModel)
                    .filter(MessageModel.influencer_id == inf.id)
                    .first()
                )

                validated_msg = self.personalization_service.personalize_creator(profile_schema)

                # Real-time accountability output
                msg_status_style = "green" if validated_msg.validation_status == "VALID" else "yellow"
                try:
                    console.print(
                        f"        [bold cyan]•[/bold cyan] [bold]{inf.name}[/bold] -> Pitch Generated ([bold]{validated_msg.email_word_count}w[/bold] Email, [bold]{validated_msg.dm_word_count}w[/bold] DM) [{msg_status_style}]{validated_msg.validation_status}[/{msg_status_style}]"
                    )
                except Exception:
                    pass

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
                    saved_messages.append(existing_msg)
                else:
                    msg_model = MessageModel(
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
                    session.add(msg_model)
                    saved_messages.append(msg_model)

            session.flush()

        return saved_messages

    def execute_outreach(self, mode: Optional[str] = None) -> Dict[str, Any]:
        """Stage 7: Execute safe simulation or live SMTP outreach."""
        send_mode = mode or self.settings.SEND_MODE
        with get_db() as session:
            if send_mode == "smtp":
                return self.smtp_dispatcher.dispatch_batch(session)
            else:
                return self.simulator.run_simulation(session)

    def export_csvs(self) -> Dict[str, str]:
        """Export final datasets to data/exports/."""
        exports_dir = self.settings.DATA_EXPORTS_DIR
        os.makedirs(exports_dir, exist_ok=True)

        influencers_csv_path = os.path.join(exports_dir, "influencers.csv")
        messages_csv_path = os.path.join(exports_dir, "messages.csv")
        outreach_csv_path = os.path.join(exports_dir, "outreach.csv")

        with get_db() as session:
            # 1. Influencers CSV
            influencers = session.query(InfluencerModel).all()
            inf_rows = []
            for inf in influencers:
                breakdown = inf.score_breakdown or {}
                inf_rows.append({
                    "ID": inf.id,
                    "Name": inf.name,
                    "Platform": inf.platform,
                    "Channel ID": inf.channel_id,
                    "Followers": inf.followers,
                    "Engagement Proxy (%)": inf.engagement_rate if inf.engagement_rate is not None else "Not Available",
                    "Engagement Type": inf.engagement_rate_type,
                    "Average Views": inf.average_views,
                    "Average Likes": inf.average_likes,
                    "Average Comments": inf.average_comments,
                    "Niche": inf.niche,
                    "Niche Confidence": inf.niche_confidence,
                    "Technology Relevance Score": inf.technology_relevance_score,
                    "Technology Relevance Reason": inf.technology_relevance_reason,
                    "Technology Video Ratio": inf.technology_video_ratio,
                    "Content Theme": ", ".join(inf.content_themes) if inf.content_themes else "Technology",
                    "Email": inf.email,
                    "Contact Email": inf.email,
                    "Email Source": inf.email_source,
                    "Email Status": inf.email_status,
                    "Profile URL": inf.profile_url,
                    "Website": inf.website or "Not Available",
                    "Audience Age": inf.audience_age,
                    "Audience Gender": inf.audience_gender,
                    "Audience Geography": inf.audience_geography,
                    "Brand Fit Score": inf.brand_fit_score,
                    "Follower Fit Score": breakdown.get("follower_fit", 0),
                    "Tech Relevance Score": breakdown.get("tech_relevance", 0),
                    "Content Relevance Score": breakdown.get("content_relevance", 0),
                    "Engagement Score": breakdown.get("engagement_proxy", 0),
                    "Geo Score": breakdown.get("geo_relevance", 0),
                    "Status": inf.status,
                    "Filter Reasons": " | ".join(inf.filter_reasons) if inf.filter_reasons else "None",
                    "Created At": inf.created_at.isoformat() if inf.created_at else "",
                })
            df_inf = pd.DataFrame(inf_rows)
            df_inf.to_csv(influencers_csv_path, index=False, encoding="utf-8")

            # 2. Messages CSV
            messages = session.query(MessageModel).join(InfluencerModel).all()
            msg_rows = []
            for msg in messages:
                inf = msg.influencer
                msg_rows.append({
                    "Message ID": msg.id,
                    "Influencer ID": msg.influencer_id,
                    "Name": inf.name if inf else "Unknown",
                    "Email": inf.email if inf else "Not Found",
                    "Email Subject": msg.email_subject,
                    "Email Pitch": msg.email_body,
                    "Email Word Count": msg.email_word_count,
                    "Instagram DM": msg.instagram_dm,
                    "DM Word Count": msg.dm_word_count,
                    "DM Status": "READY_FOR_MANUAL_SEND",
                    "Collaboration Angle": msg.collaboration_angle,
                    "Personalization Signals": " | ".join(msg.personalization_signals) if msg.personalization_signals else "",
                    "Model": msg.model,
                    "Validation Status": msg.validation_status,
                    "Validation Errors": " | ".join(msg.validation_errors) if msg.validation_errors else "",
                    "Created At": msg.created_at.isoformat() if msg.created_at else "",
                })
            df_msg = pd.DataFrame(msg_rows)
            df_msg.to_csv(messages_csv_path, index=False, encoding="utf-8")

            # 3. Outreach CSV
            outreaches = session.query(OutreachModel).join(InfluencerModel).all()
            outreach_rows = []
            for o in outreaches:
                inf = o.influencer
                outreach_rows.append({
                    "Outreach ID": o.id,
                    "Influencer": inf.name if inf else f"ID: {o.influencer_id}",
                    "Email": o.email,
                    "Message Generated": "YES" if o.message_id else "NO",
                    "Message ID": o.message_id or "",
                    "Sent": "YES" if o.status in ("SENT", "SIMULATED") else "NO",
                    "Date": o.sent_at.isoformat() if o.sent_at else "",
                    "Status": o.status,
                    "Send Mode": o.send_mode,
                    "Error Message": o.error_message or "",
                })
            df_out = pd.DataFrame(outreach_rows)
            df_out.to_csv(outreach_csv_path, index=False, encoding="utf-8")

        logger.info(f"Exports generated successfully in {exports_dir}")
        return {
            "influencers_csv": influencers_csv_path,
            "messages_csv": messages_csv_path,
            "outreach_csv": outreach_csv_path,
        }

    def run_full_pipeline(
        self,
        target_count: int = 80,
        outreach_mode: Optional[str] = None,
        target_niche: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute the entire 7-stage workflow and display summary banner."""
        mode = outreach_mode or self.settings.SEND_MODE
        console.print("\n[bold cyan]=========================================[/bold cyan]")
        console.print("[bold cyan] EDXSO AI INFLUENCER OUTREACH SYSTEM[/bold cyan]")
        console.print("[bold cyan]=========================================[/bold cyan]\n")

        if target_niche and target_niche.strip().lower() != "all":
            console.print(f"[bold magenta]Target Niche Focus:[/bold magenta] [bold yellow]{target_niche}[/bold yellow]\n")

        # Stage 1: Discovery
        console.print("[bold yellow][1/7] Discovering creators...[/bold yellow]")
        raw_channels = self.discover_and_collect(target_count=target_count, custom_niche=target_niche)
        console.print(f"      [green][OK][/green] Discovered [bold]{len(raw_channels)}[/bold] candidate creators.")

        # Stage 2: Validation
        console.print("[bold yellow][2/7] Validating profiles...[/bold yellow]")
        valid_channels = [c for c in raw_channels if self.settings.MIN_SUBSCRIBERS <= c.subscriber_count <= self.settings.MAX_SUBSCRIBERS]
        console.print(f"      [green][OK][/green] [bold]{len(valid_channels)}[/bold] valid within micro-influencer bounds (5k-100k).")

        # Stage 3 & 4: Filtering & Enrichment
        console.print("[bold yellow][3/7] Filtering & scoring creators...[/bold yellow]")
        saved_influencers = self.filter_and_enrich_channels(valid_channels, target_niche=target_niche)
        
        with get_db() as session:
            qualified_count = session.query(InfluencerModel).filter(InfluencerModel.status == "QUALIFIED").count()
            review_count = session.query(InfluencerModel).filter(InfluencerModel.status == "REVIEW").count()
            rejected_count = session.query(InfluencerModel).filter(InfluencerModel.status == "REJECTED").count()
            emails_found_count = session.query(InfluencerModel).filter(InfluencerModel.email != "Not Found").count()
            emails_missing_count = session.query(InfluencerModel).filter(InfluencerModel.email == "Not Found").count()

        console.print(f"      [green][OK][/green] Filtering: [bold]{qualified_count}[/bold] qualified, [bold]{review_count}[/bold] review, [bold]{rejected_count}[/bold] rejected.")
        console.print("[bold yellow][4/7] Enriching profile data...[/bold yellow]")
        console.print(f"      [green][OK][/green] Enrichment: [bold]{emails_found_count}[/bold] public emails found, [bold]{emails_missing_count}[/bold] marked Not Found.")

        # Stage 5 & 6: AI Personalization & Message Validation
        console.print(f"[bold yellow][5/7] Generating AI personalizations via Groq ({self.personalization_service.model})...[/bold yellow]")
        messages = self.personalize_qualified(target_niche=target_niche)
        with get_db() as session:
            valid_msgs_count = session.query(MessageModel).filter(MessageModel.validation_status == "VALID").count()
            review_msgs_count = session.query(MessageModel).filter(MessageModel.validation_status == "MANUAL_REVIEW").count()

        console.print("[bold yellow][6/7] Validating messages (Word count & Guardrails)...[/bold yellow]")
        console.print(f"      [green][OK][/green] Messages: [bold]{valid_msgs_count}[/bold] valid, [bold]{review_msgs_count}[/bold] flagged for manual review.")

        # Stage 7: Outreach Execution / Simulation
        console.print(f"[bold yellow][7/7] Executing outreach (Mode: {mode.upper()})...[/bold yellow]")
        outreach_results = self.execute_outreach(mode=mode)
        console.print(f"      [green][OK][/green] Outreach: [bold]{outreach_results.get('simulated_count', outreach_results.get('sent_count', 0))}[/bold] processed, [bold]{outreach_results.get('duplicates_skipped', 0)}[/bold] duplicates skipped.")

        # Export CSVs
        exports = self.export_csvs()

        # Final Summary Report Card
        console.print("\n[bold green]=========================================[/bold green]")
        console.print("[bold green] EDXSO AI INFLUENCER OUTREACH SYSTEM[/bold green]")
        console.print("[bold green]=========================================[/bold green]")
        console.print(f"[bold]Discovery[/bold]\n  Creators discovered: {len(raw_channels)}")
        console.print(f"[bold]Filtering[/bold]\n  Qualified: {qualified_count}\n  Review: {review_count}\n  Rejected: {rejected_count}")
        console.print(f"[bold]Enrichment[/bold]\n  Emails found: {emails_found_count}\n  Emails not found: {emails_missing_count}")
        console.print(f"[bold]AI Personalization (Groq: {self.personalization_service.model})[/bold]\n  Messages generated: {len(messages)}\n  Messages requiring review: {review_msgs_count}")
        console.print(f"[bold]Outreach ({mode.upper()})[/bold]\n  Eligible emails: {outreach_results.get('eligible_influencers', emails_found_count)}\n  Processed: {outreach_results.get('simulated_count', outreach_results.get('sent_count', 0))}\n  Duplicates skipped: {outreach_results.get('duplicates_skipped', 0)}")
        console.print(f"[bold]Exports[/bold]:\n  {exports['influencers_csv']}\n  {exports['messages_csv']}\n  {exports['outreach_csv']}")
        console.print("[bold green]Pipeline completed successfully.[/bold green]")
        console.print("[bold green]=========================================[/bold green]\n")

        return {
            "discovered": len(raw_channels),
            "qualified": qualified_count,
            "review": review_count,
            "rejected": rejected_count,
            "emails_found": emails_found_count,
            "emails_missing": emails_missing_count,
            "messages_generated": len(messages),
            "valid_messages": valid_msgs_count,
            "review_messages": review_msgs_count,
            "outreach": outreach_results,
            "exports": exports,
        }
