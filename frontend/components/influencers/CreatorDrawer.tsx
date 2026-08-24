"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Mail,
  Copy,
  Check,
  Sparkles,
  TrendingUp,
  Eye,
  ThumbsUp,
  MessageCircle,
  Video,
  ShieldCheck,
  Globe,
  Tag,
  Zap,
} from "lucide-react";
import { Influencer } from "@/lib/types";
import { getInfluencerDetail } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatNumber } from "@/lib/utils";

interface CreatorDrawerProps {
  influencerId: number | null;
  onClose: () => void;
  onOpenMessageReview?: (influencerId: number) => void;
}

export function CreatorDrawer({ influencerId, onClose, onOpenMessageReview }: CreatorDrawerProps) {
  const [data, setData] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!influencerId) {
      setData(null);
      return;
    }
    setLoading(true);
    getInfluencerDetail(influencerId)
      .then((res) => setData(res))
      .catch((err) => console.error("Error loading influencer detail:", err))
      .finally(() => setLoading(false));
  }, [influencerId]);

  if (!influencerId) return null;

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in">
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-surface border-l border-border shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Creator CRM Record
            </span>
            {data && <StatusBadge status={data.status} />}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-slate-400 hover:bg-surface-hover hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs text-slate-400">Loading creator intelligence...</span>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-6 p-6">
            {/* Creator Profile Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 text-lg font-bold text-white border border-primary/40 shadow-inner">
                  {data.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{data.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span>YouTube Creator</span>
                    <span>•</span>
                    <span className="text-primary font-medium">{data.niche}</span>
                  </div>
                </div>
              </div>

              <a
                href={data.profile_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-primary hover:text-white transition"
              >
                <span>YouTube</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Subscribers</span>
                <div className="text-base font-bold text-white mt-1">{formatNumber(data.followers)}</div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Avg Views</span>
                <div className="text-base font-bold text-white mt-1">
                  {data.avg_views ? formatNumber(data.avg_views) : "N/A"}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Engagement</span>
                <div className="text-base font-bold text-emerald-400 mt-1">
                  {data.engagement_rate !== null ? `${data.engagement_rate}%` : "Not Available"}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Brand Fit</span>
                <div className="text-base font-bold text-primary mt-1">{data.brand_fit_score} / 100</div>
              </div>
            </div>

            {/* Contact & Profile Information */}
            <div className="rounded-xl border border-border bg-surface-raised p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Contact & Verification
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Contact Email:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {data.email !== "Not Found" ? (
                      <>
                        <span className="font-mono text-cyan-400 font-semibold">{data.email}</span>
                        <button
                          onClick={() => handleCopyEmail(data.email)}
                          className="text-slate-400 hover:text-white transition"
                          title="Copy email"
                        >
                          {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-500 italic">Not Found (Zero Guessing Policy)</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Email Source & Status:</span>
                  <div className="font-medium text-slate-300 mt-1 font-mono text-[11px]">
                    <code>{data.email_source}</code> &bull; <span className="text-emerald-400">{data.email_status || (data.email !== "Not Found" ? "FOUND" : "NOT_FOUND")}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Primary Niche:</span>
                  <div className="font-medium text-white mt-1">
                    {data.niche} ({data.technology_relevance_score ? `${data.technology_relevance_score}/100` : `${Math.round((data.niche_confidence || 0.8) * 100)}% match`})
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Creator Website / Links:</span>
                  <div className="font-medium text-slate-300 mt-1 truncate">
                    {data.website && data.website !== "Not Available" ? (
                      <a href={data.website} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        <span>{data.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500">Not Available</span>
                    )}
                  </div>
                </div>
              </div>

              {data.technology_relevance_reason && (
                <div className="pt-2 border-t border-border/50 text-[11px] text-slate-300">
                  <span className="text-slate-400 block mb-0.5 font-semibold">Technology Relevance Audit:</span>
                  <p className="italic text-slate-300">{data.technology_relevance_reason}</p>
                </div>
              )}

              {/* Content Themes */}
              <div className="pt-2 border-t border-border/50">
                <span className="text-[11px] text-slate-400 block mb-1.5">Detected Content Themes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.content_themes && data.content_themes.length > 0 ? (
                    data.content_themes.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-slate-300"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* 100-Point Brand Fit Score Breakdown */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  100-Point Brand-Fit Rubric Breakdown
                </h3>
                <span className="text-xs font-bold text-primary">{data.brand_fit_score} / 100</span>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <div className="rounded-lg border border-border bg-surface p-2">
                  <span className="text-[10px] text-slate-400 block">Followers</span>
                  <span className="font-bold text-white mt-0.5 block">{data.score_breakdown?.follower_fit ?? data.score_breakdown?.follower_fit_score ?? 0}/25</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-2">
                  <span className="text-[10px] text-slate-400 block">Relevance</span>
                  <span className="font-bold text-white mt-0.5 block">{(data.score_breakdown?.tech_relevance ?? data.score_breakdown?.tech_relevance_score ?? 0).toFixed(1)}/25</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-2">
                  <span className="text-[10px] text-slate-400 block">Content</span>
                  <span className="font-bold text-white mt-0.5 block">{data.score_breakdown?.content_relevance ?? data.score_breakdown?.content_relevance_score ?? 0}/20</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-2">
                  <span className="text-[10px] text-slate-400 block">Engagement</span>
                  <span className="font-bold text-white mt-0.5 block">{data.score_breakdown?.engagement_proxy ?? data.score_breakdown?.engagement_score ?? 0}/20</span>
                </div>
                <div className="rounded-lg border border-border bg-surface p-2">
                  <span className="text-[10px] text-slate-400 block">Geography</span>
                  <span className="font-bold text-white mt-0.5 block">{data.score_breakdown?.geo_relevance ?? data.score_breakdown?.geographic_score ?? 0}/10</span>
                </div>
              </div>

              {data.technology_video_ratio !== undefined && (
                <div className="text-[11px] text-slate-400 pt-1">
                  <strong>Tech Video Evidence Ratio:</strong> {(data.technology_video_ratio * 100).toFixed(0)}% verified technology uploads
                </div>
              )}

              {data.filter_reasons && data.filter_reasons.length > 0 && (
                <div className="text-[11px] text-slate-400 pt-1">
                  <strong>Audit Notes:</strong> {data.filter_reasons.join(" | ")}
                </div>
              )}
            </div>

            {/* AI Outreach Intelligence */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    AI Outreach Intelligence (Groq)
                  </h3>
                </div>
                {data.message && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMessageReview?.(data.id);
                    }}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    Open Full Pitch Editor →
                  </button>
                )}
              </div>

              {data.message ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Collaboration Angle:</span>
                    <span className="font-semibold text-white ml-2">{data.message.collaboration_angle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Referenced Video Signals:</span>
                    <ul className="list-disc list-inside text-slate-300 mt-1 space-y-0.5">
                      {data.message.personalization_signals.map((sig, i) => (
                        <li key={i}>{sig}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3 mt-2">
                    <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                      Email Pitch Preview ({data.message.email_word_count} words | Validated)
                    </span>
                    <p className="text-slate-200 line-clamp-3 italic">"{data.message.email_body}"</p>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  {data.status === "QUALIFIED"
                    ? "Qualified creator. Personalized messaging is ready to be generated in the AI Messages workspace."
                    : "Creator status is under review. Qualification required before AI outreach generation."}
                </div>
              )}
            </div>

            {/* Recent Public Videos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Video className="h-4 w-4 text-primary" />
                  <span>Recent YouTube Uploads ({data.recent_videos?.length || 0})</span>
                </h3>
              </div>

              <div className="space-y-2">
                {data.recent_videos && data.recent_videos.length > 0 ? (
                  data.recent_videos.map((vid, idx) => (
                    <a
                      key={idx}
                      href={vid.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col justify-between rounded-lg border border-border bg-background p-3 hover:border-primary/50 hover:bg-surface-raised transition"
                    >
                      <span className="text-xs font-semibold text-white group-hover:text-primary transition line-clamp-1">
                        {vid.title}
                      </span>
                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {formatNumber(vid.views)} views
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {formatNumber(vid.likes)} likes
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(vid.comments)} comments
                        </span>
                        <span className="ml-auto text-[10px] text-slate-500">{vid.published_at.substring(0, 10)}</span>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-lg border border-border bg-background p-4 text-center text-xs text-slate-500">
                    No recent public video data cached.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
