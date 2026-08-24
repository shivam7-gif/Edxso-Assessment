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
  RefreshCw,
  Clock,
  Play,
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
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time pipeline metrics, qualification rates, and outreach activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => router.push("/discovery")}
            className="flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-xs"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Run Discovery</span>
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <MetricCard
          title="Discovered"
          value={kpis ? kpis.total_discovered : "..."}
          subtext="Total Candidates"
          icon={Users}
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
          title="Public Emails"
          value={kpis ? kpis.emails_found_count : "..."}
          subtext={`${kpis?.email_coverage_rate ?? kpis?.emails_rate ?? 0}% Coverage`}
          icon={Mail}
          badge="No Guessing"
          badgeType="info"
          onClick={() => router.push("/influencers?email_only=true")}
        />

        <MetricCard
          title="AI Pitches"
          value={kpis ? kpis.messages_count : "..."}
          subtext={`${kpis?.messages_validated_rate || 0}% Validated`}
          icon={Sparkles}
          badge="60-90w"
          badgeType="success"
          onClick={() => router.push("/messages")}
        />

        <MetricCard
          title="Outreach Sent"
          value={kpis ? kpis.outreach_sent_count : "..."}
          subtext={`${kpis?.outreach_simulated_count || 0} Simulated`}
          icon={Send}
          onClick={() => router.push("/outreach")}
        />

        <MetricCard
          title="Engagement Proxy"
          value={kpis ? `${kpis.avg_engagement_proxy}%` : "..."}
          subtext="Public video proxy"
          icon={TrendingUp}
          badge="Public Data"
          badgeType="warning"
          onClick={() => router.push("/analytics")}
        />
      </div>

      {/* Horizontal Pipeline */}
      <HorizontalPipeline funnel={data?.funnel} />

      {/* Grid: Top Opportunities & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Top Creator Opportunities Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-white p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Top Opportunities
                </h3>
                <p className="text-xs text-slate-400">High brand-fit creators qualified for outreach</p>
              </div>
              <Link
                href="/influencers"
                className="flex items-center gap-1 text-xs font-medium text-slate-700 hover:underline"
              >
                <span>View all ({kpis?.total_discovered || 0})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 text-[10px] uppercase font-semibold text-slate-400">
                    <th className="py-2 pl-2">Creator</th>
                    <th className="py-2 text-right">Subscribers</th>
                    <th className="py-2 pl-3">Niche</th>
                    <th className="py-2 text-right">Engagement</th>
                    <th className="py-2 text-right">Fit Score</th>
                    <th className="py-2 pl-3">Email</th>
                    <th className="py-2 pr-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCreators.map((creator) => (
                    <tr
                      key={creator.id}
                      onClick={() => setSelectedCreatorId(creator.id)}
                      className="cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 pl-2 font-medium text-slate-900 flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">
                          {creator.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="hover:underline truncate max-w-[150px]">{creator.name}</span>
                      </td>
                      <td className="py-2 text-right font-mono text-slate-700">{formatNumber(creator.followers)}</td>
                      <td className="py-2 pl-3 text-slate-600 truncate max-w-[100px]">{creator.niche}</td>
                      <td className="py-2 text-right font-mono text-slate-700">
                        {creator.engagement_rate !== null ? `${creator.engagement_rate}%` : "N/A"}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-slate-900">{creator.brand_fit_score}</td>
                      <td className="py-2 pl-3 font-mono text-[11px] text-slate-700 truncate max-w-[120px]">
                        {creator.email !== "Not Found" ? (
                          <span className="text-slate-900 font-medium">{creator.email}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not Found</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <StatusBadge status={creator.status} />
                      </td>
                    </tr>
                  ))}

                  {topCreators.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No creators discovered yet. Click "Run Discovery" to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Activity Stream (1 Col) */}
        <div className="rounded-lg border border-border bg-white p-4 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recent Activity
              </h3>
              <p className="text-xs text-slate-400">Live stream of pipeline events</p>
            </div>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-80 pr-1">
            {data?.recent_activities && data.recent_activities.length > 0 ? (
              data.recent_activities.map((act) => (
                <div key={act.id} className="text-xs p-2 rounded border border-border bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 truncate">{act.title}</p>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">{formatTimeAgo(act.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{act.detail}</p>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-slate-400">
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
