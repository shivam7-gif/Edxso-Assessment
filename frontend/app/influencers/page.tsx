"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Play,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CreatorDrawer } from "@/components/influencers/CreatorDrawer";
import { getInfluencers, InfluencersResponse } from "@/lib/api";
import { Influencer } from "@/lib/types";
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

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Influencers CRM</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover, evaluate, and manage verified micro-influencer relationships.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-raised hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
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

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border bg-surface p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search creators by name or niche keyword..."
              className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none transition"
            />
          </div>

          {/* Niche Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={selectedNiche}
              onChange={(e) => {
                setSelectedNiche(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All Niches</option>
              <option value="AI">AI & Machine Learning</option>
              <option value="Programming">Programming</option>
              <option value="Software Engineering">Software Engineering</option>
              <option value="DevOps">DevOps & Cloud</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Gadgets">Gadgets & Consumer Tech</option>
              <option value="Comedy">Comedy & Entertainment</option>
              <option value="Fitness">Fitness & Health</option>
              <option value="Gaming">Gaming & Esports</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-36">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="REVIEW">Review</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Sort Column */}
          <div className="w-full md:w-44">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split("-");
                setSortBy(col);
                setSortOrder(ord as "asc" | "desc");
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-white focus:border-primary focus:outline-none"
            >
              <option value="brand_fit_score-desc">Brand Fit (Highest)</option>
              <option value="brand_fit_score-asc">Brand Fit (Lowest)</option>
              <option value="followers-desc">Followers (High to Low)</option>
              <option value="followers-asc">Followers (Low to High)</option>
              <option value="engagement_rate-desc">Engagement (Highest)</option>
              <option value="name-asc">Name (A to Z)</option>
            </select>
          </div>

          {/* Verified Email Only Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer whitespace-nowrap px-1">
            <input
              type="checkbox"
              checked={emailOnly}
              onChange={(e) => {
                setEmailOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded border-border bg-background text-primary focus:ring-0"
            />
            <span>Verified Email Only</span>
          </label>
        </div>

        {/* Action bar for selected rows */}
        {selectedRows.length > 0 && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-medium text-white">
              {selectedRows.length} creators selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/messages?creators=${selectedRows.join(",")}`)}
                className="flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                <span>Generate Batch Pitches</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main CRM Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 pl-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={Boolean(data && data.items.length > 0 && selectedRows.length === data.items.length)}
                    className="rounded border-border bg-background text-primary"
                  />
                </th>
                <th className="py-3 px-2">Creator</th>
                <th className="py-3 px-2">Platform</th>
                <th className="py-3 px-2">Followers</th>
                <th className="py-3 px-2">Engagement Proxy</th>
                <th className="py-3 px-2">Niche</th>
                <th className="py-3 px-2">Brand Fit</th>
                <th className="py-3 px-2">Verified Contact</th>
                <th className="py-3 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span className="text-xs">Loading CRM table...</span>
                    </div>
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((creator) => (
                  <tr
                    key={creator.id}
                    className="table-row-hover cursor-pointer transition"
                  >
                    <td className="py-3 pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(creator.id)}
                        onChange={() => handleRowSelect(creator.id)}
                        className="rounded border-border bg-background text-primary"
                      />
                    </td>

                    <td
                      className="py-3 px-2 font-medium text-white"
                      onClick={() => setSelectedCreatorId(creator.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-[10px] font-bold text-white border border-primary/30">
                          {creator.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-white hover:text-primary transition block">
                            {creator.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {creator.channel_id.substring(0, 12)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-slate-400" onClick={() => setSelectedCreatorId(creator.id)}>
                      <span className="inline-flex items-center gap-1 font-medium text-slate-300">
                        YouTube
                      </span>
                    </td>

                    <td className="py-3 px-2 font-mono text-slate-200" onClick={() => setSelectedCreatorId(creator.id)}>
                      {formatNumber(creator.followers)}
                    </td>

                    <td className="py-3 px-2 font-mono font-medium text-emerald-400" onClick={() => setSelectedCreatorId(creator.id)}>
                      {creator.engagement_rate !== null ? `${creator.engagement_rate}%` : <span className="text-slate-500 font-normal">N/A</span>}
                    </td>

                    <td className="py-3 px-2 text-slate-300" onClick={() => setSelectedCreatorId(creator.id)}>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700">
                        {creator.niche}
                      </span>
                    </td>

                    <td className="py-3 px-2 font-mono font-bold text-primary" onClick={() => setSelectedCreatorId(creator.id)}>
                      {creator.brand_fit_score} / 100
                    </td>

                    <td className="py-3 px-2 text-slate-300 font-mono text-[11px]" onClick={() => setSelectedCreatorId(creator.id)}>
                      {creator.email !== "Not Found" ? (
                        <span className="text-cyan-400 font-medium">{creator.email}</span>
                      ) : (
                        <span className="text-slate-500 italic">Not Found</span>
                      )}
                    </td>

                    <td className="py-3 pr-4 text-right" onClick={() => setSelectedCreatorId(creator.id)}>
                      <StatusBadge status={creator.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No creators match the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && (
          <div className="flex items-center justify-between border-t border-border bg-surface-raised px-4 py-3 text-xs text-slate-400">
            <span>
              Showing {data.items.length} of {data.total} creators (Page {data.page} of {data.total_pages})
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-slate-300 disabled:opacity-40 hover:bg-surface transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-slate-300 disabled:opacity-40 hover:bg-surface transition"
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
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Influencers CRM...</div>}>
      <InfluencersCRMContent />
    </Suspense>
  );
}
