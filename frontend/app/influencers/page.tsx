"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreatorDrawer } from "@/components/influencers/CreatorDrawer";
import { getInfluencers, InfluencersResponse, generateBatchMessages } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

function InfluencersCRMContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<InfluencersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

  // Filter States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedNiche, setSelectedNiche] = useState(searchParams.get("niche") || "all");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");
  const [emailOnly, setEmailOnly] = useState(searchParams.get("email_only") === "true");
  const [sortBy, setSortBy] = useState("brand_fit_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const res = await getInfluencers({
        search: search.trim() || undefined,
        niche: selectedNiche !== "all" ? selectedNiche : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        email_only: emailOnly,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: 25,
      });
      setData(res);
    } catch (err) {
      console.error("Error fetching influencers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfluencers();
  }, [search, selectedNiche, selectedStatus, emailOnly, sortBy, sortOrder, page]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data) {
      setSelectedRows(data.items.map((i) => i.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleRowSelect = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((r) => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleExportCSV = () => {
    window.open("http://127.0.0.1:8000/api/exports/influencers.csv", "_blank");
  };

  const handleGenerateAllPitches = async () => {
    setIsGeneratingAll(true);
    try {
      const res = await generateBatchMessages(selectedNiche !== "all" ? selectedNiche : undefined);
      alert(`AI Personalization Complete! ${res.message}`);
      fetchInfluencers();
    } catch (err: any) {
      alert(`Error generating batch pitches: ${err.message || err}`);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Influencers</h1>
            {data && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {data.total}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified micro-influencer discovery, brand-fit evaluation, and outreach status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateAllPitches}
            disabled={isGeneratingAll}
            className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-xs"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAll ? "animate-spin text-slate-900" : "text-slate-500"}`} />
            <span>{isGeneratingAll ? "Generating..." : "Generate Pitches"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
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

      {/* Filter Toolbar */}
      <div className="rounded-lg border border-border bg-white p-3 space-y-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search creator name or keyword..."
              className="h-8 w-full rounded border border-border bg-slate-50/50 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none transition"
            />
          </div>

          {/* Niche Dropdown */}
          <div className="w-40">
            <select
              value={selectedNiche}
              onChange={(e) => {
                setSelectedNiche(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded border border-border bg-slate-50/50 px-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="all">All Niches</option>
              <option value="AI">AI & Machine Learning</option>
              <option value="Programming">Programming</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="DevOps">DevOps & Cloud</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Gadgets">Gadgets & Tech</option>
              <option value="Comedy">Comedy</option>
              <option value="Gaming">Gaming</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-32">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded border border-border bg-slate-50/50 px-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="REVIEW">Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Sort Column */}
          <div className="w-40">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split("-");
                setSortBy(col);
                setSortOrder(ord as "asc" | "desc");
              }}
              className="h-8 w-full rounded border border-border bg-slate-50/50 px-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="brand_fit_score-desc">Fit Score (High to Low)</option>
              <option value="brand_fit_score-asc">Fit Score (Low to High)</option>
              <option value="followers-desc">Followers (High to Low)</option>
              <option value="followers-asc">Followers (Low to High)</option>
              <option value="engagement_rate-desc">Engagement (Highest)</option>
              <option value="name-asc">Name (A to Z)</option>
            </select>
          </div>

          {/* Verified Email Only Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={emailOnly}
              onChange={(e) => {
                setEmailOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span>Public Email Only</span>
          </label>
        </div>

        {/* Action bar for selected rows */}
        {selectedRows.length > 0 && (
          <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs">
            <span className="font-semibold text-slate-900">
              {selectedRows.length} creators selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/messages?creators=${selectedRows.join(",")}`)}
                className="font-semibold text-slate-900 hover:underline"
              >
                Generate Pitches →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main CRM Table (Attio / Linear Data Grid style) */}
      <div className="rounded-lg border border-border bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                <th className="py-2.5 pl-3 w-8">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={Boolean(data && data.items.length > 0 && selectedRows.length === data.items.length)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                </th>
                <th className="py-2.5 px-3">Creator</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3 text-right">Subscribers</th>
                <th className="py-2.5 px-3 text-right">Avg Views</th>
                <th className="py-2.5 px-3 text-right">Engagement</th>
                <th className="py-2.5 px-3">Niche</th>
                <th className="py-2.5 px-3 text-right">Fit Score</th>
                <th className="py-2.5 px-3">Public Contact</th>
                <th className="py-2.5 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                      <span className="text-xs">Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((creator) => {
                  const isSelected = selectedRows.includes(creator.id);
                  return (
                    <tr
                      key={creator.id}
                      onClick={() => setSelectedCreatorId(creator.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-slate-100/70" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="py-2.5 pl-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(creator.id)}
                          className="rounded border-slate-300 text-slate-900"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200">
                            {creator.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-medium text-slate-900 hover:underline truncate block">
                              {creator.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {creator.channel_id.substring(0, 10)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        YouTube
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatNumber(creator.followers)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatNumber(creator.avg_views)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {creator.engagement_rate !== null ? `${creator.engagement_rate}%` : "N/A"}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        {creator.niche}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {creator.brand_fit_score}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-xs">
                        {creator.email !== "Not Found" ? (
                          <span className="text-slate-900 font-medium">{creator.email}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not Found</span>
                        )}
                      </td>

                      <td className="py-2.5 pr-4 text-right">
                        <StatusBadge status={creator.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No creators match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && (
          <div className="flex items-center justify-between border-t border-border bg-slate-50/50 px-4 py-2.5 text-xs text-slate-500">
            <span>
              Showing {data.items.length} of {data.total} creators (Page {data.page} of {data.total_pages})
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="flex h-6 w-6 items-center justify-center rounded border border-border bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition shadow-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
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

export default function InfluencersCRMPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Influencers...</div>}>
      <InfluencersCRMContent />
    </Suspense>
  );
}
