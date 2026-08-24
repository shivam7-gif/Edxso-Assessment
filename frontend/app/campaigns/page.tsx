"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Users,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Sliders,
} from "lucide-react";
import { getCampaigns } from "@/lib/api";
import { Campaign } from "@/lib/types";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Campaign Form State
  const [newTitle, setNewTitle] = useState("");
  const [newNiche, setNewNiche] = useState("Technology");
  const [newAudience, setNewAudience] = useState("Developers & Engineers (5k-100k)");

  useEffect(() => {
    getCampaigns()
      .then((res) => setCampaigns(res.campaigns))
      .catch((err) => console.error("Error loading campaigns:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name: newTitle.trim(),
      target_niche: newNiche,
      audience: newAudience,
      creators_count: 0,
      messages_count: 0,
      sent_count: 0,
      responses_count: 0,
      status: "Active",
      created_at: new Date().toISOString(),
    };

    setCampaigns([newCamp, ...campaigns]);
    setIsModalOpen(false);
    setNewTitle("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize, segment, and track targeted influencer outreach campaigns.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-primary-hover transition"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-xs text-slate-500">
            Loading campaigns...
          </div>
        ) : campaigns.length > 0 ? (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 hover:border-primary/50 hover:bg-surface-raised transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={camp.status} />
                  <span className="text-[10px] text-slate-500 font-mono">
                    {camp.created_at.substring(0, 10)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mt-3 group-hover:text-primary transition line-clamp-1">
                  {camp.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{camp.target_niche}</p>

                {/* Target Audience Pill */}
                <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Target Criteria
                  </span>
                  <span className="text-slate-200 font-medium">{camp.audience}</span>
                </div>

                {/* Pipeline Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="rounded-lg border border-border bg-background p-2">
                    <span className="text-[10px] text-slate-500 block">Creators</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {camp.creators_count}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-2">
                    <span className="text-[10px] text-slate-500 block">Pitches</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                      {camp.messages_count}
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-2">
                    <span className="text-[10px] text-slate-500 block">Sent</span>
                    <span className="text-sm font-bold text-cyan-400 mt-0.5 block">
                      {camp.sent_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button */}
              <button
                onClick={() => router.push(`/influencers?niche=${encodeURIComponent(camp.target_niche)}`)}
                className="mt-5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-semibold text-slate-300 hover:border-primary hover:text-white transition"
              >
                <span>Inspect Pipeline</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-16 text-center text-xs text-slate-500">
            No campaigns found. Click "New Campaign" to create one.
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Create New Outreach Campaign</h2>
            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q3 Comedy Sketches Outreach"
                  className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Niche</label>
                <input
                  type="text"
                  required
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  placeholder="e.g. Comedy, Fitness, Python, Gaming"
                  className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Target Audience Profile</label>
                <input
                  type="text"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  placeholder="e.g. Micro-influencers (5k-50k subscribers)"
                  className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 font-medium text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-white hover:bg-primary-hover shadow-md"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
