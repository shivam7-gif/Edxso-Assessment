"""SMTP email dispatcher with TLS and robust error recovery."""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.database.models import InfluencerModel, MessageModel, OutreachModel
from app.outreach.tracker import OutreachTracker
from app.utils.logging import get_logger

logger = get_logger("outreach.smtp")


class SMTPEmailDispatcher:
    """Dispatches live outreach emails via standard SMTP."""

    def __init__(self):
        self.settings = get_settings()
        self.tracker = OutreachTracker()

    def send_single_email(
        self,
        to_email: str,
        subject: str,
        body: str,
    ) -> tuple[bool, Optional[str]]:
        """Send an individual email via SMTP with STARTTLS."""
        is_valid, error_msg = self.settings.validate_smtp_config()
        if not is_valid:
            return False, error_msg

        msg = MIMEMultipart()
        msg["From"] = self.settings.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain", "utf-8"))

        try:
            with smtplib.SMTP(self.settings.SMTP_HOST, self.settings.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.settings.SMTP_USERNAME, self.settings.SMTP_PASSWORD)
                server.send_message(msg)
            return True, None
        except Exception as e:
            logger.error(f"Failed to dispatch email to {to_email}: {e}")
            return False, str(e)

    def dispatch_batch(self, session: Session) -> Dict[str, Any]:
        """Dispatch live emails to all qualified creators with valid emails and messages."""
        influencers = (
            session.query(InfluencerModel)
            .filter(InfluencerModel.status == "QUALIFIED")
            .all()
        )

        sent_count = 0
        failed_count = 0
        skipped_duplicate_count = 0
        missing_email_count = 0

        for inf in influencers:
            if not inf.email or inf.email == "Not Found":
                missing_email_count += 1
                continue

            message = (
                session.query(MessageModel)
                .filter(MessageModel.influencer_id == inf.id)
                .order_by(MessageModel.created_at.desc())
                .first()
            )
            if not message or message.validation_status != "VALID":
                logger.warning(f"Skipping creator '{inf.name}': valid message not available.")
                continue

            # Duplicate prevention check
            if self.tracker.is_already_contacted(session, inf.id):
                logger.info(f"[SMTP] Skipping duplicate outreach for creator '{inf.name}' (ID: {inf.id})")
                skipped_duplicate_count += 1
                continue

            # Attempt live send
            success, err = self.send_single_email(
                to_email=inf.email,
                subject=message.email_subject,
                body=message.email_body,
            )

            status = "SENT" if success else "FAILED"
            self.tracker.record_outreach(
                session=session,
                influencer_id=inf.id,
                email=inf.email,
                message_id=message.id,
                status=status,
                send_mode="smtp",
                error_message=err,
            )

            if success:
                sent_count += 1
                logger.info(f"[SMTP] Successfully sent outreach email to '{inf.name}' <{inf.email}>")
            else:
                failed_count += 1

        session.flush()

        return {
            "sent_count": sent_count,
            "failed_count": failed_count,
            "duplicates_skipped": skipped_duplicate_count,
            "missing_emails": missing_email_count,
        }
