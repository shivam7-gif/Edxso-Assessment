"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Mail,
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
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Conversion metrics, qualification rates, and email attribution breakdown.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
          subtext={`${kpis?.emails_found_count || 0} public emails`}
          badge="Zero Guessing"
          badgeType="info"
        />

        <MetricCard
          title="Pitch Validation Rate"
          value={kpis ? `${kpis.messages_validated_rate}%` : "..."}
          subtext="60–90w word limit"
          badge="Groq LLM"
          badgeType="success"
        />

        <MetricCard
          title="Avg Engagement Proxy"
          value={kpis ? `${kpis.avg_engagement_proxy}%` : "..."}
          subtext="Public (Likes+Comments)/Subs"
          badge="Public Proxy"
          badgeType="warning"
        />
      </div>

      <div className="rounded border border-border bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <strong>Engagement Proxy Note:</strong> Calculated strictly from public video metrics (likes and comments relative to subscribers).
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg border border-border bg-white p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outreach Conversion Funnel
          </h3>
          <span className="text-xs font-mono text-slate-400">Total: {funnel?.discovered || 0}</span>
        </div>

        <div className="space-y-2.5 pt-1">
          {[
            { label: "1. Discovered (YouTube Raw Pool)", count: funnel?.discovered || 0, color: "bg-slate-400" },
            { label: "2. Qualified (Brand-Fit Score ≥ 70)", count: funnel?.qualified || 0, color: "bg-slate-700" },
            { label: "3. Enriched (Public Emails Found)", count: funnel?.enriched || 0, color: "bg-slate-800" },
            { label: "4. Personalized (Groq Pitches Generated)", count: funnel?.personalized || 0, color: "bg-slate-900" },
            { label: "5. Ready for Outreach (Approved & Valid)", count: funnel?.ready_for_outreach || 0, color: "bg-emerald-600" },
            { label: "6. Outreach Dispatched (Sent / Simulated)", count: funnel?.sent || 0, color: "bg-emerald-500" },
          ].map((stage, idx) => {
            const pct = funnel?.discovered ? Math.round((stage.count / (funnel.discovered || 1)) * 100) : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900">{stage.count}</span>
                    <span className="text-[11px] text-slate-400 font-mono">({pct}%)</span>
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(2, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Email Sources, Niches & Follower Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Public Email Sources */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-border flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-500" />
            <span>Public Email Sources</span>
          </h3>

          <div className="space-y-2 pt-1">
            {Object.entries(emailSources).map(([sourceName, count]) => {
              const pct = Math.round((count / maxEmailSrcVal) * 100);
              return (
                <div key={sourceName} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{sourceName}</span>
                    <span className="font-mono font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {Object.keys(emailSources).length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">No email sources data available.</div>
            )}
          </div>
        </div>

        {/* Niche Breakdown */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-border">
            Niche Distribution
          </h3>

          <div className="space-y-2 pt-1">
            {Object.entries(niches).map(([nicheName, count]) => {
              const pct = Math.round((count / maxNicheVal) * 100);
              return (
                <div key={nicheName} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{nicheName}</span>
                    <span className="font-mono font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Follower Bracket Breakdown */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-border">
            Follower Brackets
          </h3>

          <div className="space-y-2 pt-1">
            {Object.entries(followerBrackets).map(([bracket, count]) => {
              const pct = Math.round((count / maxFollowerVal) * 100);
              return (
                <div key={bracket} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{bracket}</span>
                    <span className="font-mono font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full"
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
