"""Outreach tracking and duplicate outreach prevention engine."""

from typing import Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import OutreachModel, InfluencerModel, MessageModel
from app.utils.logging import get_logger

logger = get_logger("outreach.tracker")


class OutreachTracker:
    """Manages outreach states and enforces strict duplicate outreach prevention."""

    ACTIVE_OUTREACH_STATUSES = {"SENT", "QUEUED", "SIMULATED"}

    def is_already_contacted(self, session: Session, influencer_id: int) -> bool:
        """Check if an outreach record already exists for this influencer."""
        existing = (
            session.query(OutreachModel)
            .filter(
                OutreachModel.influencer_id == influencer_id,
                OutreachModel.status.in_(self.ACTIVE_OUTREACH_STATUSES),
            )
            .first()
        )
        return existing is not None

    def record_outreach(
        self,
        session: Session,
        influencer_id: int,
        email: str,
        message_id: Optional[int],
        status: str,
        send_mode: str,
        error_message: Optional[str] = None,
    ) -> OutreachModel:
        """Store an outreach attempt in the database."""
        outreach_record = OutreachModel(
            influencer_id=influencer_id,
            email=email,
            message_id=message_id,
            status=status,
            send_mode=send_mode,
            sent_at=datetime.now(timezone.utc),
            error_message=error_message,
        )
        session.add(outreach_record)
        session.flush()
        return outreach_record

    def get_all_records(self, session: Session) -> List[OutreachModel]:
        """Fetch all recorded outreach attempts."""
        return session.query(OutreachModel).order_by(OutreachModel.sent_at.desc()).all()
