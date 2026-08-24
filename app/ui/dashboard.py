"""Interactive Streamlit Dashboard for EDXSO Automated Micro-Influencer Outreach System."""

import os
import sys
import json
import pandas as pd
import streamlit as st

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.config.settings import get_settings
from app.database.database import get_db, init_db
from app.database.models import InfluencerModel, MessageModel, OutreachModel
from app.pipeline.orchestrator import PipelineOrchestrator

# Configure page settings
st.set_page_config(
    page_title="EDXSO Influencer Outreach Platform",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom CSS for clean, executive, modern UI
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .stApp {
        background-color: #0B0F17;
        color: #E2E8F0;
    }
    
    /* Header Card */
    .header-card {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
    }
    
    /* Metric Cards */
    .stat-card {
        background-color: #161F30;
        border: 1px solid #283548;
        border-radius: 10px;
        padding: 16px 20px;
        text-align: left;
    }
    .stat-label {
        font-size: 12px;
        font-weight: 600;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 6px;
    }
    .stat-value {
        font-size: 26px;
        font-weight: 700;
        color: #F8FAFC;
    }
    .stat-subtext {
        font-size: 12px;
        color: #64748B;
        margin-top: 4px;
    }

    /* Badges */
    .badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
    }
    .badge-qualified {
        background-color: rgba(16, 185, 129, 0.15);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-review {
        background-color: rgba(245, 158, 11, 0.15);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-rejected {
        background-color: rgba(239, 68, 68, 0.15);
        color: #F87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .badge-niche {
        background-color: rgba(99, 102, 241, 0.15);
        color: #A5B4FC;
        border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .badge-email-found {
        background-color: rgba(14, 165, 233, 0.15);
        color: #38BDF8;
        border: 1px solid rgba(14, 165, 233, 0.3);
    }
    .badge-email-missing {
        background-color: rgba(148, 163, 184, 0.12);
        color: #94A3B8;
        border: 1px solid rgba(148, 163, 184, 0.25);
    }

    /* Theme Pill */
    .theme-pill {
        display: inline-block;
        background-color: #1E293B;
        color: #CBD5E1;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 4px;
        margin-right: 6px;
        margin-bottom: 4px;
        border: 1px solid #334155;
    }

    /* Bullet Box */
    .bullet-box {
        background-color: #131B2A;
        border: 1px solid #233146;
        border-radius: 8px;
        padding: 16px;
        margin: 10px 0;
    }
    .bullet-title {
        font-size: 13px;
        font-weight: 600;
        color: #38BDF8;
        margin-bottom: 4px;
    }
    .bullet-content {
        font-size: 13px;
        color: #E2E8F0;
        line-height: 1.6;
    }
</style>
""", unsafe_allow_html=True)

# Ensure database is initialized
init_db()
settings = get_settings()


def load_data():
    """Load latest database records directly without stale caching."""
    with get_db() as session:
        # 1. Influencers
        infs = session.query(InfluencerModel).all()
        inf_data = []
        for i in infs:
            bd = i.score_breakdown or {}
            inf_data.append({
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
                "email_source": i.email_source,
                "email_status": i.email_status,
                "website": i.website,
                "audience_geography": i.audience_geography,
                "brand_fit_score": i.brand_fit_score,
                "status": i.status,
                "filter_reasons": i.filter_reasons or [],
                "follower_score": bd.get("follower_fit", 0),
                "tech_score": bd.get("tech_relevance", 0),
                "content_score": bd.get("content_relevance", 0),
                "eng_score": bd.get("engagement_proxy", 0),
                "geo_score": bd.get("geo_relevance", 0),
                "recent_videos": i.recent_videos or [],
            })
        df_influencers = pd.DataFrame(inf_data)

        # 2. Messages
        msgs = session.query(MessageModel).all()
        msg_data = []
        for m in msgs:
            msg_data.append({
                "id": m.id,
                "influencer_id": m.influencer_id,
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
                "created_at": m.created_at,
            })
        df_messages = pd.DataFrame(msg_data)

        # 3. Outreach
        outs = session.query(OutreachModel).all()
        out_data = []
        for o in outs:
            out_data.append({
                "id": o.id,
                "influencer_id": o.influencer_id,
                "email": o.email,
                "message_id": o.message_id,
                "status": o.status,
                "send_mode": o.send_mode,
                "sent_at": o.sent_at,
                "error_message": o.error_message,
            })
        df_outreach = pd.DataFrame(out_data)

    return df_influencers, df_messages, df_outreach


# Load live data
df_inf, df_msg, df_out = load_data()


# ==========================================
# SIDEBAR NAVIGATION & QUICK CONTROLS
# ==========================================
with st.sidebar:
    st.markdown("### EDXSO Outreach System")
    st.caption("Micro-Influencer Discovery & AI Personalization Engine")
    st.markdown("---")

    nav_choice = st.radio(
        "Navigation",
        [
            "Executive Overview",
            "Influencers & Outreach Pitches",
            "Analytics & Scoring Deep Dive",
            "Outreach Dispatch Log",
            "Pipeline Controls",
        ],
        index=0,
    )

    st.markdown("---")
    st.markdown("**Live Database State**")
    st.text(f"Creators: {len(df_inf)}")
    st.text(f"Pitches: {len(df_msg)}")
    st.text(f"Outreach Records: {len(df_out)}")
    st.text(f"Active Model: {settings.GROQ_MODEL}")

    st.markdown("---")
    if st.button("🔄 Refresh Data", use_container_width=True):
        st.rerun()

    if st.button("🗑️ Clear Database (Fresh Run)", use_container_width=True):
        PipelineOrchestrator().clear_database()
        st.success("Database cleared! Run pipeline to populate fresh data.")
        st.rerun()


# ==========================================
# 1. EXECUTIVE OVERVIEW
# ==========================================
if nav_choice == "Executive Overview":
    st.title("Executive Overview")
    st.caption("Real-time pipeline metrics, qualification breakdown, and niche distribution")

    if df_inf.empty:
        st.warning("No creator data in database yet. Launch discovery from the Pipeline Controls tab.")
    else:
        total_discovered = len(df_inf)
        qualified_count = len(df_inf[df_inf["status"] == "QUALIFIED"])
        review_count = len(df_inf[df_inf["status"] == "REVIEW"])
        rejected_count = len(df_inf[df_inf["status"] == "REJECTED"])
        emails_found = len(df_inf[df_inf["email"] != "Not Found"])
        email_coverage = (emails_found / total_discovered * 100) if total_discovered > 0 else 0
        avg_followers = int(df_inf["followers"].mean())
        avg_score = round(df_inf["brand_fit_score"].mean(), 1)
        valid_eng = df_inf[df_inf["engagement_rate"].notnull()]["engagement_rate"]
        avg_eng = round(valid_eng.mean(), 2) if not valid_eng.empty else 0.0

        c1, c2, c3, c4, c5 = st.columns(5)
        with c1:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Total Discovered</div>
                <div class="stat-value">{total_discovered}</div>
                <div class="stat-subtext">Real YouTube Channels</div>
            </div>
            """, unsafe_allow_html=True)
        with c2:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Qualified (≥70)</div>
                <div class="stat-value" style="color: #34D399;">{qualified_count}</div>
                <div class="stat-subtext">{qualified_count/total_discovered*100:.0f}% of discovered pool</div>
            </div>
            """, unsafe_allow_html=True)
        with c3:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Public Emails Found</div>
                <div class="stat-value" style="color: #38BDF8;">{emails_found}</div>
                <div class="stat-subtext">{email_coverage:.1f}% public coverage (No Guessing)</div>
            </div>
            """, unsafe_allow_html=True)
        with c4:
            st.markdown(f"""
            <div class="stat-card">
                <div class="stat-label">Average Audience</div>
                <div class="stat-value">{avg_followers:,}</div>
                <div class="stat-subtext">5,000 - 100,000 bounds</div>
            </div>
            """, unsafe_allow_html=True)
        with c5:
            st.markdown(f"""
            <div class="stat-card" title="Calculated from publicly available recent-video likes and comments relative to subscriber count. This is a public proxy and not private YouTube Analytics data.">
                <div class="stat-label">Avg Public Engagement Proxy</div>
                <div class="stat-value">{avg_eng}%</div>
                <div class="stat-subtext">Public video interaction proxy</div>
            </div>
            """, unsafe_allow_html=True)

        st.caption("ℹ️ *Avg Public Engagement Proxy is calculated from publicly available recent-video likes and comments relative to subscriber count. This is a public proxy and not private YouTube Analytics data.*")

        st.markdown("<br>", unsafe_allow_html=True)
        col_left, col_right = st.columns([1, 1])

        with col_left:
            st.subheader("Qualification Status Breakdown")
            status_counts = df_inf["status"].value_counts().reset_index()
            status_counts.columns = ["Status", "Count"]
            st.bar_chart(status_counts.set_index("Status"))

        with col_right:
            st.subheader("Public Email Source Breakdown")
            source_labels = {
                "youtube_description": "YouTube description",
                "creator_website": "Creator website",
                "contact_page": "Contact page",
                "about_page": "About page",
                "business_page": "Business page",
                "public_social_profile": "Public social profile",
                "not_found": "Not found",
            }
            email_src_counts = df_inf["email_source"].map(lambda s: source_labels.get(s, s.replace("_", " ").title())).value_counts().reset_index()
            email_src_counts.columns = ["Email Source", "Count"]
            st.dataframe(email_src_counts, use_container_width=True, hide_index=True)


# ==========================================
# 2. INFLUENCERS & OUTREACH PITCHES (MAIN TAB)
# ==========================================
elif nav_choice == "Influencers & Outreach Pitches":
    st.title("Influencer Explorer & Outreach Pitches")
    st.caption("Inspect full YouTuber details, brand-fit audit scores, and AI-generated collaboration pitches in hamburger drawers.")

    if df_inf.empty:
        st.info("No influencers found in the database. Run the pipeline first.")
    else:
        # Top Filter & Niche Selector Bar
        st.markdown("##### Filter Target Pool")
        f1, f2, f3, f4 = st.columns([1.5, 1.2, 1, 1.5])
        
        all_niches = sorted(df_inf["niche"].unique().tolist())
        with f1:
            selected_niches = st.multiselect("Technology Niche", all_niches, default=all_niches)
        with f2:
            status_options = ["QUALIFIED", "REVIEW", "REJECTED"]
            available_statuses = [s for s in status_options if s in df_inf["status"].unique()]
            selected_statuses = st.multiselect("Qualification Status", available_statuses, default=["QUALIFIED"] if "QUALIFIED" in available_statuses else available_statuses)
        with f3:
            verified_email_only = st.checkbox("Verified Email Only", value=False)
        with f4:
            search_query = st.text_input("Search YouTuber by Name", placeholder="e.g. ArjanCodes, BugBytes...")

        # Apply Filters
        filtered = df_inf.copy()
        if selected_niches:
            filtered = filtered[filtered["niche"].isin(selected_niches)]
        if selected_statuses:
            filtered = filtered[filtered["status"].isin(selected_statuses)]
        if verified_email_only:
            filtered = filtered[filtered["email"] != "Not Found"]
        if search_query.strip():
            filtered = filtered[filtered["name"].str.contains(search_query.strip(), case=False, na=False)]

        st.markdown(f"**Showing {len(filtered)} YouTubers matching criteria**")
        st.markdown("---")

        # Merge with messages and outreach data
        msg_map = {}
        if not df_msg.empty:
            msg_map = {row["influencer_id"]: row for _, row in df_msg.iterrows()}

        out_map = {}
        if not df_out.empty:
            out_map = {row["influencer_id"]: row for _, row in df_out.iterrows()}

        # Display Each YouTuber with full details & Hamburger Drawer for Outreach
        for idx, row in filtered.iterrows():
            inf_id = row["id"]
            name = row["name"]
            subs = row["followers"]
            niche = row["niche"]
            score = row["brand_fit_score"]
            status = row["status"]
            email = row["email"]
            channel_url = row["profile_url"]
            themes = row["content_themes"]

            # Associated Message & Outreach
            msg = msg_map.get(inf_id)
            out = out_map.get(inf_id)

            status_class = "badge-qualified" if status == "QUALIFIED" else ("badge-review" if status == "REVIEW" else "badge-rejected")
            email_class = "badge-email-found" if email != "Not Found" else "badge-email-missing"

            # Header Expander (Hamburger Drawer)
            expander_title = f"{name}  |  {subs:,} subscribers  |  {niche}  |  Score: {score}/100 [{status}]  |  Email: {email}"
            
            with st.expander(expander_title, expanded=False):
                # 1. YouTuber Statistics
                st.markdown("##### 1. YouTuber Details & Metrics")
                m1, m2, m3, m4, m5 = st.columns(5)
                with m1:
                    st.metric("Subscribers", f"{subs:,}")
                with m2:
                    st.metric("Average Views", f"{int(row['avg_views']):,}" if row['avg_views'] else "N/A")
                with m3:
                    st.metric("Average Likes", f"{int(row['avg_likes']):,}" if row['avg_likes'] else "N/A")
                with m4:
                    eng_str = f"{row['engagement_rate']:.2f}%" if pd.notnull(row['engagement_rate']) else "Not Available"
                    st.metric("Engagement Proxy", eng_str)
                with m5:
                    st.metric("Location / Geo", row['audience_geography'] or "Global")

                # Channel link, Email, and Themes
                theme_pills_html = "".join([f'<span class="theme-pill">{t}</span>' for t in themes]) if themes else "<em>None detected</em>"
                st.markdown(f"""
                <div style="margin-top: 8px; margin-bottom: 16px;">
                    <strong>Channel Link:</strong> <a href="{channel_url}" target="_blank" style="color: #38BDF8;">{channel_url}</a> &nbsp;|&nbsp;
                    <strong>Email Source:</strong> <code>{row['email_source']}</code> &nbsp;|&nbsp;
                    <strong>Email Status:</strong> <code>{row['email_status']}</code> &nbsp;|&nbsp;
                    <strong>Tech Video Ratio:</strong> <code>{row['technology_video_ratio']:.0%}</code> &nbsp;|&nbsp;
                    <strong>Content Themes:</strong> {theme_pills_html}
                </div>
                """, unsafe_allow_html=True)

                # 2. 100-Point Brand Fit Score Breakdown
                st.markdown("##### 2. Brand-Fit Rubric & Technology Relevance Audit")
                s1, s2, s3, s4, s5 = st.columns(5)
                with s1:
                    st.write(f"**Follower Fit:** {row['follower_score']}/25")
                with s2:
                    st.write(f"**Tech Relevance:** {row['tech_score']:.1f}/25 ({row['technology_relevance_score']}/100)")
                with s3:
                    st.write(f"**Content Frequency:** {row['content_score']}/20")
                with s4:
                    st.write(f"**Engagement Proxy:** {row['eng_score']}/20")
                with s5:
                    st.write(f"**Geography Fit:** {row['geo_score']}/10")

                st.info(f"**Technology Relevance Reason:** {row['technology_relevance_reason']}")

                if row['filter_reasons']:
                    st.caption(f"Audit Filter Reasons: {', '.join(row['filter_reasons'])}")

                st.markdown("---")

                # 3. Generated Outreach Pitch in Hamburger Bullets
                st.markdown("##### 3. AI-Generated Outreach Pitch & Direct Message")
                if msg:
                    # Email Pitch Bullet
                    st.markdown(f"""
                    <div class="bullet-box">
                        <div class="bullet-title">• Email Subject Line</div>
                        <div class="bullet-content"><strong>{msg['email_subject']}</strong></div>
                        <br>
                        <div class="bullet-title">• Email Body Pitch ({msg['email_word_count']} words | Target: 60-90 words)</div>
                        <div class="bullet-content">{msg['email_body']}</div>
                    </div>
                    """, unsafe_allow_html=True)

                    # Instagram DM Bullet
                    st.markdown(f"""
                    <div class="bullet-box">
                        <div class="bullet-title">• Instagram Direct Message ({msg['dm_word_count']} words | Target: 15-30 words)</div>
                        <div class="bullet-content">{msg['instagram_dm']}</div>
                        <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">
                            <strong>DM Status:</strong> <code>READY_FOR_MANUAL_SEND</code> (Platform compliance enforced)
                        </div>
                    </div>
                    """, unsafe_allow_html=True)

                    # Evidence & Meta Signals Bullet
                    signals_str = " | ".join(msg['personalization_signals']) if msg['personalization_signals'] else "General creator content"
                    out_status = out['status'] if out else "SIMULATED"
                    out_mode = out['send_mode'] if out else "simulation"
                    sent_date = out['sent_at'] if out and out['sent_at'] else "Recorded"

                    st.markdown(f"""
                    <div class="bullet-box">
                        <div class="bullet-title">• Personalization Signals & Audit Metadata</div>
                        <div class="bullet-content">
                            <strong>Collaboration Angle:</strong> {msg['collaboration_angle']}<br>
                            <strong>Cited Video Titles:</strong> {signals_str}<br>
                            <strong>LLM Model:</strong> <code>{msg['model']}</code> &nbsp;|&nbsp;
                            <strong>Validation Status:</strong> <span style="color: #34D399; font-weight: 600;">{msg['validation_status']}</span> &nbsp;|&nbsp;
                            <strong>Outreach Status:</strong> <code>{out_status}</code> (Mode: {out_mode}, Timestamp: {sent_date})
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.info("AI Personalization not generated for this creator yet (requires status = QUALIFIED).")


# ==========================================
# 3. ANALYTICS & SCORING DEEP DIVE
# ==========================================
elif nav_choice == "Analytics & Scoring Deep Dive":
    st.title("Analytics & Scoring Deep Dive")
    st.caption("Distribution of brand-fit scores, engagement proxy metrics, and sub-niche representation")

    if df_inf.empty:
        st.info("No data available. Run pipeline to view analytics.")
    else:
        tab1, tab2 = st.tabs(["Score Distribution", "Engagement Proxy Analysis"])

        with tab1:
            st.subheader("Brand Fit Score Distribution (0-100)")
            st.bar_chart(df_inf["brand_fit_score"].value_counts().sort_index())

            st.markdown("##### Score Summary Statistics")
            st.write(df_inf[["brand_fit_score", "follower_score", "tech_score", "content_score", "eng_score", "geo_score"]].describe())

        with tab2:
            st.subheader("Public Engagement Proxy (%) Distribution")
            valid_eng_df = df_inf[df_inf["engagement_rate"].notnull()]
            if not valid_eng_df.empty:
                st.line_chart(valid_eng_df.set_index("name")["engagement_rate"])
            else:
                st.info("No engagement proxy data available.")


# ==========================================
# 4. OUTREACH DISPATCH LOG
# ==========================================
elif nav_choice == "Outreach Dispatch Log":
    st.title("Outreach Dispatch & Duplicate Prevention Log")
    st.caption("Complete audit trail of email delivery simulation and live SMTP dispatches")

    if df_out.empty:
        st.info("No outreach actions recorded yet.")
    else:
        merged_out = df_out.merge(df_inf[["id", "name", "niche", "followers"]], left_on="influencer_id", right_on="id", how="left")
        st.dataframe(
            merged_out[[
                "id_x", "name", "email", "niche", "status", "send_mode", "sent_at", "error_message"
            ]].rename(columns={
                "id_x": "Outreach ID",
                "name": "YouTuber Name",
                "email": "Contact Email",
                "niche": "Niche",
                "status": "Dispatch Status",
                "send_mode": "Mode",
                "sent_at": "Timestamp",
                "error_message": "Errors",
            }),
            use_container_width=True,
            hide_index=True,
        )


# ==========================================
# 5. PIPELINE CONTROLS & EXPORTS
# ==========================================
elif nav_choice == "Pipeline Controls":
    st.title("Pipeline Controls & CSV Exports")
    st.caption("Execute full workflow or individual stages with custom niche parameters")

    orchestrator = PipelineOrchestrator()

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("Execute Workflow")
        selected_niche = st.selectbox(
            "Select Target Technology Niche",
            [
                "All Technology (Broad)",
                "Artificial Intelligence",
                "Programming",
                "DevOps",
                "Cybersecurity",
                "Machine Learning",
                "Gadgets",
                "Custom Keyword",
            ],
            index=0,
        )

        custom_niche_input = ""
        if selected_niche == "Custom Keyword":
            custom_niche_input = st.text_input("Enter Custom Niche Query", placeholder="e.g. Next.js, Rust...")

        final_niche = custom_niche_input if (selected_niche == "Custom Keyword" and custom_niche_input.strip()) else (selected_niche if selected_niche != "All Technology (Broad)" else "all")

        wipe_first = st.checkbox("Wipe previous database records before fresh run", value=True)
        candidates_target = st.slider("Discovery Target Candidates", 50, 120, 85, step=5)
        outreach_mode_choice = st.selectbox("Outreach Mode", ["simulation", "smtp"])

        if st.button("Run Full Pipeline", type="primary", use_container_width=True):
            with st.spinner(f"Running pipeline for niche '{final_niche}'..."):
                try:
                    if wipe_first:
                        orchestrator.clear_database()
                    summary = orchestrator.run_full_pipeline(
                        target_count=candidates_target,
                        outreach_mode=outreach_mode_choice,
                        target_niche=final_niche,
                    )
                    st.success("Pipeline executed successfully!")
                    st.json(summary)
                    st.rerun()
                except Exception as e:
                    st.error(f"Pipeline error: {e}")

    with col2:
        st.subheader("CSV Exports")
        if st.button("Generate & Download Fresh CSV Exports", use_container_width=True):
            with st.spinner("Exporting..."):
                try:
                    paths = orchestrator.export_csvs()
                    st.success("Exports generated in data/exports/")
                    st.write(paths)
                except Exception as e:
                    st.error(f"Export error: {e}")

        # Download buttons for existing exports
        inf_csv_path = "data/exports/influencers.csv"
        msg_csv_path = "data/exports/messages.csv"
        out_csv_path = "data/exports/outreach.csv"

        if os.path.exists(inf_csv_path):
            with open(inf_csv_path, "rb") as f:
                st.download_button("Download influencers.csv", f.read(), "influencers.csv", "text/csv", use_container_width=True)

        if os.path.exists(msg_csv_path):
            with open(msg_csv_path, "rb") as f:
                st.download_button("Download messages.csv", f.read(), "messages.csv", "text/csv", use_container_width=True)

        if os.path.exists(out_csv_path):
            with open(out_csv_path, "rb") as f:
                st.download_button("Download outreach.csv", f.read(), "outreach.csv", "text/csv", use_container_width=True)
