"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Users,
  CheckCircle2,
  Mail,
  Sparkles,
  Send,
  RefreshCw,
  Globe,
} from "lucide-react";
import { MetricCard } from "@/components/common/MetricCard";
import { getAnalytics } from "@/lib/api";
import { AnalyticsResponse } from "@/lib/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getAnalytics();
      setData(res);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const kpis = data?.kpis;
  const funnel = data?.funnel;
  const niches = data?.niche_breakdown || {};
  const followerBrackets = data?.follower_brackets || {};
  const emailSources = data?.email_sources || {};

  const maxNicheVal = Math.max(...Object.values(niches), 1);
  const maxFollowerVal = Math.max(...Object.values(followerBrackets), 1);
  const maxEmailSrcVal = Math.max(...Object.values(emailSources), 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach & Pipeline Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep-dive metrics across qualification rates, public email sources, niche distributions, and proxy engagement.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-raised hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Qualification Rate"
          value={kpis ? `${kpis.qualification_rate}%` : "..."}
          subtext={`${kpis?.qualified_count || 0} of ${kpis?.total_discovered || 0} creators`}
          badge="Score ≥ 70"
          badgeType="success"
        />

        <MetricCard
          title="Public Email Coverage"
          value={kpis ? `${kpis.email_coverage_rate ?? kpis.emails_rate}%` : "..."}
          subtext={`${kpis?.emails_found_count || 0} public emails found`}
          badge="Zero Guessing"
          badgeType="info"
        />

        <MetricCard
          title="Pitch Validation Rate"
          value={kpis ? `${kpis.messages_validated_rate}%` : "..."}
          subtext="Strict 60-90w constraint"
          badge="Groq Llama-3.3"
          badgeType="success"
        />

        <MetricCard
          title="Avg Public Engagement Proxy"
          value={kpis ? `${kpis.avg_engagement_proxy}%` : "..."}
          subtext="Public (Likes+Comments)/Subs"
          badge="Public Proxy"
          badgeType="warning"
        />
      </div>

      <div className="rounded-lg bg-surface/50 border border-border/60 px-4 py-2.5 text-xs text-slate-400">
        ℹ️ <strong>Avg Public Engagement Proxy:</strong> Calculated from publicly available recent-video likes and comments relative to subscriber count. This is a public proxy and not private YouTube Analytics data.
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-semibold text-white">Full Outreach Conversion Funnel</h3>
          <span className="text-xs text-slate-400">Total Discovered: {funnel?.discovered || 0}</span>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { label: "1. Discovered (YouTube Raw Pool)", count: funnel?.discovered || 0, color: "bg-slate-600" },
            { label: "2. Qualified (Brand-Fit Score ≥ 70)", count: funnel?.qualified || 0, color: "bg-primary" },
            { label: "3. Enriched (Public Emails Found)", count: funnel?.enriched || 0, color: "bg-cyan-500" },
            { label: "4. Personalized (Groq Pitches Generated)", count: funnel?.personalized || 0, color: "bg-accent" },
            { label: "5. Ready for Outreach (Approved & Valid)", count: funnel?.ready_for_outreach || 0, color: "bg-emerald-500" },
            { label: "6. Outreach Dispatched (Sent / Simulated)", count: funnel?.sent || 0, color: "bg-emerald-400" },
          ].map((stage, idx) => {
            const pct = funnel?.discovered ? Math.round((stage.count / (funnel.discovered || 1)) * 100) : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">{stage.count}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({pct}%)</span>
                  </div>
                </div>

                <div className="h-2.5 w-full rounded-full bg-background overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all duration-500`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Email Sources, Niches & Follower Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Public Email Sources Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-border flex items-center gap-2">
            <Mail className="h-4 w-4 text-cyan-400" />
            <span>Public Email Sources</span>
          </h3>

          <div className="space-y-3 pt-1">
            {Object.entries(emailSources).map(([sourceName, count]) => {
              const pct = Math.round((count / maxEmailSrcVal) * 100);
              return (
                <div key={sourceName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{sourceName}</span>
                    <span className="font-mono font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {Object.keys(emailSources).length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">No email sources data available.</div>
            )}
          </div>
        </div>

        {/* Niche Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-border">
            Creators by Niche Distribution
          </h3>

          <div className="space-y-3 pt-1">
            {Object.entries(niches).map(([nicheName, count]) => {
              const pct = Math.round((count / maxNicheVal) * 100);
              return (
                <div key={nicheName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{nicheName}</span>
                    <span className="font-mono font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {Object.keys(niches).length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">No niche data collected yet.</div>
            )}
          </div>
        </div>

        {/* Follower Bracket Breakdown */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white pb-2 border-b border-border">
            Micro-Influencer Follower Brackets
          </h3>

          <div className="space-y-3 pt-1">
            {Object.entries(followerBrackets).map(([bracket, count]) => {
              const pct = Math.round((count / maxFollowerVal) * 100);
              return (
                <div key={bracket} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300">{bracket} Subscribers</span>
                    <span className="font-mono font-bold text-white">{count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
