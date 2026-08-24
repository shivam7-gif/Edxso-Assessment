"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowRight,
  X,
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
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Segment, organize, and track targeted influencer outreach cohorts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-xs text-slate-400">
            Loading campaigns...
          </div>
        ) : campaigns.length > 0 ? (
          campaigns.map((camp) => (
            <div
              key={camp.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-white p-4 hover:border-slate-300 transition-colors shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={camp.status} />
                  <span className="text-[11px] text-slate-400 font-mono">
                    {camp.created_at.substring(0, 10)}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 mt-2.5 line-clamp-1">
                  {camp.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{camp.target_niche}</p>

                {/* Target Audience */}
                <div className="mt-2.5 rounded border border-border bg-slate-50/50 px-2.5 py-1.5 text-xs">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Criteria
                  </span>
                  <span className="text-slate-700">{camp.audience}</span>
                </div>

                {/* Pipeline Stats Grid */}
                <div className="grid grid-cols-3 divide-x divide-border rounded border border-border bg-slate-50/50 mt-3 text-center py-2">
                  <div className="px-1">
                    <span className="text-[10px] text-slate-400 block font-medium">Creators</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{camp.creators_count}</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] text-slate-400 block font-medium">Pitches</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{camp.messages_count}</span>
                  </div>
                  <div className="px-1">
                    <span className="text-[10px] text-slate-400 block font-medium">Sent</span>
                    <span className="text-xs font-semibold text-slate-900 mt-0.5 block">{camp.sent_count}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <button
                onClick={() => router.push(`/influencers?niche=${encodeURIComponent(camp.target_niche)}`)}
                className="mt-3.5 w-full flex items-center justify-center gap-1.5 rounded border border-border bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <span>View Creators</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-12 text-center text-xs text-slate-400">
            No campaigns found.
          </div>
        )}
      </div>

      {/* New Campaign Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-modal space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-sm font-bold text-slate-900">Create Campaign</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q3 Python Developer Tools"
                  className="h-8 w-full rounded border border-border bg-slate-50/50 px-2.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Target Niche</label>
                <input
                  type="text"
                  required
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  placeholder="e.g. AI Tools, Python, DevOps"
                  className="h-8 w-full rounded border border-border bg-slate-50/50 px-2.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Target Audience Profile</label>
                <input
                  type="text"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  placeholder="e.g. Micro-influencers (5k-100k subs)"
                  className="h-8 w-full rounded border border-border bg-slate-50/50 px-2.5 text-xs text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-border bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3.5 py-1.5 font-medium text-white hover:bg-slate-800"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
