"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Eye,
  ThumbsUp,
  MessageCircle,
  Video,
  Globe,
  Sparkles,
} from "lucide-react";
import { Influencer } from "@/lib/types";
import { getInfluencerDetail, regenerateMessage } from "@/lib/api";
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
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable fields for pitch
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [instagramDm, setInstagramDm] = useState("");

  useEffect(() => {
    if (!influencerId) {
      setData(null);
      return;
    }
    setLoading(true);
    getInfluencerDetail(influencerId)
      .then((res) => {
        setData(res);
        if (res.message) {
          setEmailSubject(res.message.email_subject);
          setEmailBody(res.message.email_body);
          setInstagramDm(res.message.instagram_dm);
        }
      })
      .catch((err) => console.error("Error loading influencer detail:", err))
      .finally(() => setLoading(false));
  }, [influencerId]);

  if (!influencerId) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleGeneratePitch = async () => {
    if (!data) return;
    setGeneratingPitch(true);
    try {
      const res = await regenerateMessage(data.id);
      setEmailSubject(res.email_subject);
      setEmailBody(res.email_body);
      setInstagramDm(res.instagram_dm);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          message: {
            id: res.message_id || 1,
            influencer_id: prev.id,
            email_subject: res.email_subject,
            email_body: res.email_body,
            instagram_dm: res.instagram_dm,
            collaboration_angle: res.collaboration_angle || "Technical Demonstration",
            personalization_signals: res.personalization_signals || [],
            model: res.model || "groq/llama-3.3-70b-versatile",
            validation_status: res.validation_status || "VALID",
            validation_errors: [],
            email_word_count: res.email_word_count || res.email_body.split(/\s+/).filter(Boolean).length,
            dm_word_count: res.dm_word_count || res.instagram_dm.split(/\s+/).filter(Boolean).length,
          },
        };
      });
    } catch (err: any) {
      alert(`Error generating AI pitch: ${err.message || err}`);
    } finally {
      setGeneratingPitch(false);
    }
  };

  const emailWordCount = emailBody.trim().split(/\s+/).filter(Boolean).length;
  const dmWordCount = instagramDm.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px] transition-opacity">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white border-l border-border shadow-drawer overflow-y-auto">
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Creator Record
            </span>
            {data && <StatusBadge status={data.status} />}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
              <span className="text-xs font-medium">Loading record...</span>
            </div>
          </div>
        ) : data ? (
          <div className="divide-y divide-border">
            {/* 1. Creator Header Profile */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-800 border border-slate-200">
                    {data.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{data.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span>YouTube Creator</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700">{data.niche}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={data.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shrink-0"
                >
                  <span>Channel</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              </div>

              {/* 2. Structured Metrics Strip (Attio / Linear style) */}
              <div className="grid grid-cols-4 divide-x divide-border rounded border border-border bg-slate-50/60 mt-4 text-center">
                <div className="py-2.5 px-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Subscribers</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{formatNumber(data.followers)}</span>
                </div>
                <div className="py-2.5 px-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Avg Views</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{formatNumber(data.avg_views)}</span>
                </div>
                <div className="py-2.5 px-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Engagement</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">
                    {data.engagement_rate !== null ? `${data.engagement_rate}%` : "N/A"}
                  </span>
                </div>
                <div className="py-2.5 px-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">Fit Score</span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5 block">{data.brand_fit_score}</span>
                </div>
              </div>
            </div>

            {/* 3. Contact & Verification */}
            <div className="p-5 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Contact & Verification
              </h3>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Contact Email</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {data.email !== "Not Found" ? (
                      <>
                        <span className="font-mono text-slate-900 font-medium select-all">{data.email}</span>
                        <button
                          onClick={() => handleCopy(data.email, "email")}
                          className="text-slate-400 hover:text-slate-700 transition"
                          title="Copy email"
                        >
                          {copiedField === "email" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 italic">Not Found (Zero Guessing Policy)</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Email Source & Status</span>
                  <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                    {data.email_source} · <span className="text-slate-900 font-medium">{data.email_status || (data.email !== "Not Found" ? "Found" : "Not Found")}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Primary Niche</span>
                  <div className="text-slate-800 font-medium mt-0.5">
                    {data.niche} ({data.technology_relevance_score ? `${data.technology_relevance_score}/100` : `${Math.round((data.niche_confidence || 0.8) * 100)}% match`})
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Creator Links</span>
                  <div className="text-slate-700 mt-0.5 truncate">
                    {data.website && data.website !== "Not Available" ? (
                      <a href={data.website} target="_blank" rel="noreferrer" className="text-slate-900 hover:underline flex items-center gap-1">
                        <span className="truncate">{data.website}</span>
                        <ExternalLink className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-slate-400">None detected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Technology Relevance Audit */}
            <div className="p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Technology Relevance Audit
                </h3>
                {data.technology_video_ratio !== undefined && (
                  <span className="text-[11px] font-mono text-slate-500 font-medium">
                    Evidence: {(data.technology_video_ratio * 100).toFixed(0)}% verified tech uploads
                  </span>
                )}
              </div>

              {data.technology_relevance_reason && (
                <p className="text-xs text-slate-600 bg-slate-50 border border-border p-2.5 rounded text-left leading-relaxed">
                  {data.technology_relevance_reason}
                </p>
              )}

              {/* Detected Topics Tags */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 font-medium block mb-1.5">Detected Topics:</span>
                <div className="flex flex-wrap gap-1.5">
                  {data.content_themes && data.content_themes.length > 0 ? (
                    data.content_themes.map((theme, i) => (
                      <span
                        key={i}
                        className="rounded border border-border bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {theme}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None detected</span>
                  )}
                </div>
              </div>
            </div>

            {/* 5. 100-Point Brand Fit Rubric */}
            <div className="p-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  100-Point Fit Score Breakdown
                </h3>
                <span className="text-xs font-semibold text-slate-900 font-mono">{data.brand_fit_score} / 100</span>
              </div>

              <div className="grid grid-cols-5 divide-x divide-border rounded border border-border bg-slate-50/60 text-center py-2">
                <div className="px-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Followers</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{data.score_breakdown?.follower_fit ?? data.score_breakdown?.follower_fit_score ?? 0}/25</span>
                </div>
                <div className="px-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Relevance</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{(data.score_breakdown?.tech_relevance ?? data.score_breakdown?.tech_relevance_score ?? 0).toFixed(1)}/25</span>
                </div>
                <div className="px-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Content</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{data.score_breakdown?.content_relevance ?? data.score_breakdown?.content_relevance_score ?? 0}/20</span>
                </div>
                <div className="px-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Engagement</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{data.score_breakdown?.engagement_proxy ?? data.score_breakdown?.engagement_score ?? 0}/20</span>
                </div>
                <div className="px-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Geography</span>
                  <span className="text-xs font-semibold text-slate-800 mt-0.5 block">{data.score_breakdown?.geo_relevance ?? data.score_breakdown?.geographic_score ?? 0}/10</span>
                </div>
              </div>
            </div>

            {/* 6. AI Personalization Outreach Recommendation (Editable Surface) */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    AI Personalization
                  </h3>
                  {data.message && (
                    <StatusBadge status={data.message.validation_status} />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleGeneratePitch}
                    disabled={generatingPitch}
                    className="flex items-center gap-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-3 w-3 ${generatingPitch ? "animate-spin" : ""}`} />
                    <span>{generatingPitch ? "Generating..." : data.message ? "Regenerate" : "Generate"}</span>
                  </button>
                </div>
              </div>

              {data.message ? (
                <div className="space-y-3 text-xs">
                  {/* Email Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-500">Email Subject</span>
                      <button
                        onClick={() => handleCopy(emailSubject, "subject")}
                        className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                      >
                        {copiedField === "subject" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full rounded border border-border bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Email Body */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-500">Email Body Pitch</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${emailWordCount >= 60 && emailWordCount <= 90 ? "text-emerald-700" : "text-amber-600"}`}>
                          {emailWordCount} words (Target: 60–90w)
                        </span>
                        <button
                          onClick={() => handleCopy(emailBody, "body")}
                          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                        >
                          {copiedField === "body" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full rounded border border-border bg-slate-50/50 p-2.5 text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Instagram DM */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-500">Instagram DM</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${dmWordCount >= 15 && dmWordCount <= 30 ? "text-emerald-700" : "text-amber-600"}`}>
                          {dmWordCount} words (Target: 15–30w)
                        </span>
                        <button
                          onClick={() => handleCopy(instagramDm, "dm")}
                          className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                        >
                          {copiedField === "dm" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={instagramDm}
                      onChange={(e) => setInstagramDm(e.target.value)}
                      className="w-full rounded border border-border bg-slate-50/50 p-2 text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 truncate">
                      Angle: <strong className="text-slate-700 font-medium">{data.message.collaboration_angle}</strong>
                    </span>
                    {onOpenMessageReview && (
                      <button
                        onClick={() => onOpenMessageReview(data.id)}
                        className="text-xs font-semibold text-slate-900 hover:underline shrink-0"
                      >
                        Open in AI Studio →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-dashed border-border bg-slate-50/50 p-4 text-center">
                  <span className="text-xs text-slate-500 block mb-2">No pitch generated yet for this creator</span>
                  <button
                    onClick={handleGeneratePitch}
                    disabled={generatingPitch}
                    className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-3 w-3 ${generatingPitch ? "animate-spin" : ""}`} />
                    <span>{generatingPitch ? "Generating..." : "Generate AI Pitch"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 7. Recent Public Uploads Analyzed */}
            <div className="p-5 space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Recent Public Uploads ({data.recent_videos?.length || 0})
              </h3>

              <div className="space-y-1.5">
                {data.recent_videos && data.recent_videos.length > 0 ? (
                  data.recent_videos.map((vid) => (
                    <div
                      key={vid.video_id}
                      className="flex items-center justify-between gap-3 rounded border border-border bg-slate-50/40 px-3 py-2 text-xs hover:bg-slate-50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 hover:underline truncate block"
                        >
                          {vid.title}
                        </a>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-mono">
                          <span>{formatNumber(vid.views)} views</span>
                          <span>{formatNumber(vid.likes)} likes</span>
                          <span>{vid.published_at?.substring(0, 10)}</span>
                        </div>
                      </div>

                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-700 shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No recent video data loaded.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">No creator data found.</div>
        )}
      </div>
    </div>
  );
}
