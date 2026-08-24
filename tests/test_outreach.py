"""Unit tests for Outreach simulation, duplicate prevention, and SMTP safeguards."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Base, InfluencerModel, MessageModel, OutreachModel
from app.outreach.tracker import OutreachTracker
from app.outreach.simulator import OutreachSimulator
from app.outreach.smtp import SMTPEmailDispatcher


@pytest.fixture
def db_session():
    """In-memory SQLite test database session fixture."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_duplicate_outreach_prevention(db_session):
    """Test duplicate check flags existing SENT or SIMULATED outreach."""
    tracker = OutreachTracker()

    # Create dummy influencer
    inf = InfluencerModel(
        platform="YouTube",
        channel_id="UC_DUP_TEST",
        name="Dup Test Creator",
        profile_url="https://youtube.com/@duptest",
        followers=20000,
        email="duptest@example.com",
        status="QUALIFIED",
    )
    db_session.add(inf)
    db_session.commit()

    # Before outreach
    assert tracker.is_already_contacted(db_session, inf.id) is False

    # Record outreach
    tracker.record_outreach(
        session=db_session,
        influencer_id=inf.id,
        email=inf.email,
        message_id=None,
        status="SIMULATED",
        send_mode="simulation",
    )
    db_session.commit()

    # After outreach
    assert tracker.is_already_contacted(db_session, inf.id) is True


def test_outreach_simulation_flow(db_session):
    """Test simulation skips creators with 'Not Found' emails and processes eligible creators."""
    simulator = OutreachSimulator()

    # 1. Influencer with valid email and message
    inf1 = InfluencerModel(
        platform="YouTube",
        channel_id="UC_ELIGIBLE",
        name="Eligible Creator",
        profile_url="https://youtube.com/@eligible",
        followers=30000,
        email="creator@verified.com",
        status="QUALIFIED",
    )
    # 2. Influencer with 'Not Found' email
    inf2 = InfluencerModel(
        platform="YouTube",
        channel_id="UC_NO_EMAIL",
        name="No Email Creator",
        profile_url="https://youtube.com/@noemail",
        followers=25000,
        email="Not Found",
        status="QUALIFIED",
    )
    db_session.add_all([inf1, inf2])
    db_session.commit()

    # Add message for inf1
    msg1 = MessageModel(
        influencer_id=inf1.id,
        email_subject="Collaboration Inquiry",
        email_body="A valid pitch body...",
        instagram_dm="A valid DM...",
        collaboration_angle="Sponsorship",
        model="llama-3.3-70b-versatile",
        validation_status="VALID",
    )
    db_session.add(msg1)
    db_session.commit()

    # Run simulation
    results = simulator.run_simulation(db_session)

    assert results["eligible_influencers"] == 1
    assert results["simulated_count"] == 1
    assert results["missing_emails"] == 1
    assert results["duplicates_skipped"] == 0

    # Rerun simulation to test duplicate prevention
    rerun_results = simulator.run_simulation(db_session)
    assert rerun_results["simulated_count"] == 0
    assert rerun_results["duplicates_skipped"] == 1
