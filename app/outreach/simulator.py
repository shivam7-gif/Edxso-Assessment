"""Safe simulation layer for dry-run outreach execution."""

from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database.models import InfluencerModel, MessageModel, OutreachModel
from app.outreach.tracker import OutreachTracker
from app.utils.logging import get_logger

logger = get_logger("outreach.simulator")


class OutreachSimulator:
    """Safely simulates outreach campaigns without dispatching live emails."""

    def __init__(self):
        self.tracker = OutreachTracker()

    def run_simulation(self, session: Session) -> Dict[str, Any]:
        """Execute outreach simulation for all qualified influencers with valid emails."""
        # Query qualified influencers
        influencers = (
            session.query(InfluencerModel)
            .filter(InfluencerModel.status == "QUALIFIED")
            .all()
        )

        eligible_count = 0
        simulated_count = 0
        skipped_duplicate_count = 0
        missing_email_count = 0
        missing_message_count = 0

        simulated_records: List[OutreachModel] = []

        for inf in influencers:
            # Check email availability
            if not inf.email or inf.email == "Not Found":
                missing_email_count += 1
                continue

            # Check if personalized message exists
            message = (
                session.query(MessageModel)
                .filter(MessageModel.influencer_id == inf.id)
                .order_by(MessageModel.created_at.desc())
                .first()
            )
            if not message:
                missing_message_count += 1
                continue

            eligible_count += 1

            # Duplicate prevention check
            if self.tracker.is_already_contacted(session, inf.id):
                logger.info(
                    f"[Simulation] Skipping duplicate outreach for creator '{inf.name}' (ID: {inf.id})"
                )
                skipped_duplicate_count += 1
                continue

            # Record simulation
            record = self.tracker.record_outreach(
                session=session,
                influencer_id=inf.id,
                email=inf.email,
                message_id=message.id,
                status="SIMULATED",
                send_mode="simulation",
            )
            simulated_records.append(record)
            simulated_count += 1
            logger.info(f"[Simulation] Simulated email outreach to '{inf.name}' <{inf.email}>")

        session.flush()

        results = {
            "eligible_influencers": eligible_count,
            "simulated_count": simulated_count,
            "duplicates_skipped": skipped_duplicate_count,
            "missing_emails": missing_email_count,
            "missing_messages": missing_message_count,
        }
        return results
