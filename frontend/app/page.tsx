"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  CheckCircle2,
  Mail,
  Sparkles,
  Send,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Clock,
  Play,
  Download,
} from "lucide-react";
import { MetricCard } from "@/components/common/MetricCard";
import { HorizontalPipeline } from "@/components/common/HorizontalPipeline";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreatorDrawer } from "@/components/influencers/CreatorDrawer";
import { getAnalytics, getInfluencers } from "@/lib/api";
import { AnalyticsResponse, Influencer } from "@/lib/types";
import { formatNumber, formatTimeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [topCreators, setTopCreators] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, influencersRes] = await Promise.all([
        getAnalytics(),
        getInfluencers({ sort_by: "brand_fit_score", sort_order: "desc", page_size: 6 }),
      ]);
      setData(analyticsRes);
      setTopCreators(influencersRes.items);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Good afternoon, Shivam</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Here's what's happening with your influencer discovery and AI outreach campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-raised hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => router.push("/discovery")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-primary-hover transition"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run Discovery</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Discovered"
          value={kpis ? kpis.total_discovered : "..."}
          subtext="Total YouTube Pool"
          icon={Users}
          badge="+100% Real"
          badgeType="info"
          onClick={() => router.push("/influencers")}
        />

        <MetricCard
          title="Qualified"
          value={kpis ? kpis.qualified_count : "..."}
          subtext={`${kpis?.qualification_rate || 0}% Qualify Rate`}
          icon={CheckCircle2}
          badge="Score ≥ 70"
          badgeType="success"
          onClick={() => router.push("/influencers?status=QUALIFIED")}
        />

        <MetricCard
          title="Public Emails Found"
          value={kpis ? kpis.emails_found_count : "..."}
          subtext={`${kpis?.email_coverage_rate ?? kpis?.emails_rate ?? 0}% Coverage`}
          icon={Mail}
          badge="No Guessing"
          badgeType="info"
          onClick={() => router.push("/influencers?email_only=true")}
        />

        <MetricCard
          title="AI Messages"
          value={kpis ? kpis.messages_count : "..."}
          subtext={`${kpis?.messages_validated_rate || 0}% Validated`}
          icon={Sparkles}
          badge="60-90w Pitches"
          badgeType="success"
          onClick={() => router.push("/messages")}
        />

        <MetricCard
          title="Outreach Sent"
          value={kpis ? kpis.outreach_sent_count : "..."}
          subtext={`${kpis?.outreach_simulated_count || 0} Simulated`}
          icon={Send}
          badge="Zero Duplicates"
          badgeType="neutral"
          onClick={() => router.push("/outreach")}
        />

        <MetricCard
          title="Avg Public Engagement Proxy"
          value={kpis ? `${kpis.avg_engagement_proxy}%` : "..."}
          subtext="Public video proxy (likes+comments)"
          icon={TrendingUp}
          badge="Public Data Only"
          badgeType="warning"
          onClick={() => router.push("/analytics")}
        />
      </div>

      {/* Horizontal Pipeline Funnel */}
      <HorizontalPipeline funnel={data?.funnel} />

      {/* Grid: Top Opportunities & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Top Creator Opportunities Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Top Creator Opportunities</h3>
                <p className="text-xs text-slate-400">High brand-fit creators qualified for automated outreach</p>
              </div>
              <Link
                href="/influencers"
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <span>View all ({kpis?.total_discovered || 0})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase font-semibold text-slate-400">
                    <th className="pb-2 pl-2">Creator</th>
                    <th className="pb-2">Subscribers</th>
                    <th className="pb-2">Niche</th>
                    <th className="pb-2">Engagement</th>
                    <th className="pb-2">Brand Fit</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2 pr-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {topCreators.map((creator) => (
                    <tr
                      key={creator.id}
                      onClick={() => setSelectedCreatorId(creator.id)}
                      className="cursor-pointer hover:bg-surface-raised transition"
                    >
                      <td className="py-2.5 pl-2 font-medium text-white flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-primary">
                          {creator.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="hover:underline">{creator.name}</span>
                      </td>
                      <td className="py-2.5 text-slate-300 font-mono">{formatNumber(creator.followers)}</td>
                      <td className="py-2.5 text-slate-400">{creator.niche}</td>
                      <td className="py-2.5 text-emerald-400 font-medium font-mono">
                        {creator.engagement_rate !== null ? `${creator.engagement_rate}%` : "N/A"}
                      </td>
                      <td className="py-2.5 font-bold text-primary font-mono">{creator.brand_fit_score}</td>
                      <td className="py-2.5 text-slate-300 font-mono text-[11px]">
                        {creator.email !== "Not Found" ? (
                          <span className="text-cyan-400 font-medium">{creator.email}</span>
                        ) : (
                          <span className="text-slate-500 italic">Not Found</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-2 text-right">
                        <StatusBadge status={creator.status} />
                      </td>
                    </tr>
                  ))}

                  {topCreators.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No creators discovered yet. Click "Run Discovery" to start!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Salesforce-Style Activity Feed (1 Col) */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <p className="text-xs text-slate-400">Live stream of pipeline events</p>
            </div>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-96 pr-1">
            {data?.recent_activities && data.recent_activities.length > 0 ? (
              data.recent_activities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs p-2 rounded-lg bg-background border border-border/50">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 line-clamp-1">{act.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{act.detail}</p>
                    <span className="text-[10px] text-slate-500 block mt-1">{formatTimeAgo(act.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-40 items-center justify-center text-xs text-slate-500">
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Creator Detail Drawer */}
      <CreatorDrawer
        influencerId={selectedCreatorId}
        onClose={() => setSelectedCreatorId(null)}
        onOpenMessageReview={(id) => router.push(`/messages?creatorId=${id}`)}
      />
    </div>
  );
}
