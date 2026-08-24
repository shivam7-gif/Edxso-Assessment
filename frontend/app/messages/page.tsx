"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Check,
  Send,
  ExternalLink,
  Copy,
  Video,
  FileText,
  Mail,
  Instagram,
  User,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getMessages, getInfluencerDetail, regenerateMessage, updateMessage, approveMessage, sendSingleOutreach } from "@/lib/api";
import { Message, Influencer } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function AIMessagesContent() {
  const searchParams = useSearchParams();
  const initialCreatorId = searchParams.get("creatorId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [creatorDetail, setCreatorDetail] = useState<Influencer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Editable fields
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [instagramDm, setInstagramDm] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchMessagesList = async () => {
    setLoading(true);
    try {
      const res = await getMessages();
      setMessages(res.items);
      if (res.items.length > 0) {
        const target = initialCreatorId
          ? res.items.find((m) => m.influencer_id === parseInt(initialCreatorId)) || res.items[0]
          : res.items[0];
        handleSelectMessage(target);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesList();
  }, [initialCreatorId]);

  const handleSelectMessage = async (msg: Message) => {
    setSelectedMessage(msg);
    setSubject(msg.email_subject);
    setEmailBody(msg.email_body);
    setInstagramDm(msg.instagram_dm);

    try {
      const detail = await getInfluencerDetail(msg.influencer_id);
      setCreatorDetail(detail);
    } catch (err) {
      console.error("Error fetching creator context:", err);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedMessage) return;
    setIsRegenerating(true);
    try {
      const res = await regenerateMessage(selectedMessage.influencer_id);
      setSubject(res.email_subject);
      setEmailBody(res.email_body);
      setInstagramDm(res.instagram_dm);
      // Refresh list
      fetchMessagesList();
    } catch (err) {
      alert(`Error regenerating message: ${err}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!selectedMessage) return;
    setIsSaving(true);
    try {
      await updateMessage(selectedMessage.influencer_id, {
        email_subject: subject,
        email_body: emailBody,
        instagram_dm: instagramDm,
      });
      alert("Changes saved successfully.");
      fetchMessagesList();
    } catch (err) {
      alert(`Error saving edits: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedMessage) return;
    try {
      await approveMessage(selectedMessage.influencer_id);
      alert("Message approved for outreach.");
      fetchMessagesList();
    } catch (err) {
      alert(`Error approving message: ${err}`);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedMessage) return;
    setIsSending(true);
    try {
      const res = await sendSingleOutreach(selectedMessage.influencer_id);
      alert(`Outreach recorded successfully (Status: ${res.status}, Mode: ${res.send_mode}).`);
      fetchMessagesList();
    } catch (err: any) {
      alert(`Outreach dispatch error: ${err.message || err}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Word count calculations
  const emailWords = emailBody.trim().split(/\s+/).filter(Boolean).length;
  const dmWords = instagramDm.trim().split(/\s+/).filter(Boolean).length;

  const isEmailLengthValid = emailWords >= 60 && emailWords <= 90;
  const isDmLengthValid = dmWords >= 15 && dmWords <= 30;

  const validCount = messages.filter((m) => m.validation_status === "VALID" || m.validation_status === "APPROVED").length;
  const reviewCount = messages.filter((m) => m.validation_status === "MANUAL_REVIEW").length;

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Personalization Workspace</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review, edit, validate, and approve hyper-personalized pitches powered by Groq LLM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs">
            <span className="text-slate-400">Total Pitches:</span>
            <span className="font-bold text-white">{messages.length}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400 font-semibold">{validCount} Validated</span>
            {reviewCount > 0 && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-semibold">{reviewCount} Review</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Split-Screen Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[680px]">
        {/* Col 1: Creator Selection List (3 Cols) */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-3 flex flex-col">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-border mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Personalized Creators ({messages.length})
            </span>
          </div>

          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[640px] pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading pitches...</div>
            ) : messages.length > 0 ? (
              messages.map((m) => {
                const isSelected = selectedMessage?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMessage(m)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:bg-surface-raised hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white line-clamp-1">
                        {m.creator_name || `Creator #${m.influencer_id}`}
                      </span>
                      <StatusBadge status={m.validation_status} />
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span>{m.creator_niche}</span>
                      <span className="font-mono">{m.email_word_count}w Email</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No personalized pitches generated yet. Run discovery or generate messages.
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Creator Context Panel (4 Cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Creator Real Context</span>
              </span>
              {creatorDetail && <StatusBadge status={creatorDetail.status} />}
            </div>

            {creatorDetail ? (
              <div className="space-y-4 pt-3">
                {/* Creator Header Card */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <h3 className="text-base font-bold text-white">{creatorDetail.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{creatorDetail.niche}</span>
                    <span>•</span>
                    <span className="font-mono">{formatNumber(creatorDetail.followers)} Subs</span>
                    <span>•</span>
                    <span className="text-primary font-bold">{creatorDetail.brand_fit_score}/100</span>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono mt-1.5">
                    {creatorDetail.email !== "Not Found" ? creatorDetail.email : "Email: Not Found"}
                  </div>
                </div>

                {/* Collaboration Angle */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Collaboration Angle
                  </span>
                  <p className="text-xs font-semibold text-white">{selectedMessage?.collaboration_angle}</p>
                </div>

                {/* Referenced Signals */}
                <div className="rounded-lg border border-border bg-background p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Referenced Video Evidence
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {selectedMessage?.personalization_signals.map((sig, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent Video Contexts */}
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">
                    Recent YouTube Videos ({creatorDetail.recent_videos?.length || 0})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {creatorDetail.recent_videos?.map((v, i) => (
                      <div key={i} className="rounded border border-border/60 bg-background p-2 text-xs">
                        <div className="font-medium text-white line-clamp-1">{v.title}</div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                          <span>{formatNumber(v.views)} views</span>
                          <span>{formatNumber(v.likes)} likes</span>
                          <span>{v.published_at.substring(0, 10)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">Select a creator to view context.</div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 pt-2 border-t border-border font-mono">
            Model: {selectedMessage?.model || "openai/gpt-oss-120b"}
          </div>
        </div>

        {/* Col 3: Generated Outreach Split-Screen Review & Editor (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Generated Outreach Review</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || !selectedMessage}
                  className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 transition"
                  title="Re-prompt Groq"
                >
                  <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  onClick={handleSaveEdits}
                  disabled={isSaving || !selectedMessage}
                  className="flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50 transition"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Save Edits</span>
                </button>
              </div>
            </div>

            {selectedMessage ? (
              <div className="space-y-4 pt-3">
                {/* Email Subject Line */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span>Email Subject</span>
                    </label>
                    <button
                      onClick={() => handleCopy(subject, "subject")}
                      className="text-slate-400 hover:text-white transition text-[11px] flex items-center gap-1"
                    >
                      {copiedField === "subject" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-white focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Email Pitch Body */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300">
                      Collaboration Email Pitch
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          isEmailLengthValid
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {emailWords} / 90 words {isEmailLengthValid ? "✓ Valid" : "(Target: 60-90)"}
                      </span>
                      <button
                        onClick={() => handleCopy(emailBody, "emailBody")}
                        className="text-slate-400 hover:text-white transition text-[11px] flex items-center gap-1"
                      >
                        {copiedField === "emailBody" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-3 text-xs text-slate-200 leading-relaxed focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Instagram Direct Message */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5 text-rose-400" />
                      <span>Instagram Direct Message</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          isDmLengthValid
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {dmWords} / 30 words {isDmLengthValid ? "✓ Valid" : "(Target: 15-30)"}
                      </span>
                      <button
                        onClick={() => handleCopy(instagramDm, "dm")}
                        className="text-slate-400 hover:text-white transition text-[11px] flex items-center gap-1"
                      >
                        {copiedField === "dm" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={instagramDm}
                    onChange={(e) => setInstagramDm(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-3 text-xs text-slate-200 leading-relaxed focus:border-primary focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    * DM status: <code>READY_FOR_MANUAL_SEND</code> (Platform compliance enforced)
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">Select a message from the left list.</div>
            )}
          </div>

          {/* Action Dispatch Buttons */}
          {selectedMessage && (
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve Message</span>
              </button>

              <button
                onClick={handleSendSingle}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-white shadow-md hover:bg-primary-hover disabled:opacity-50 transition"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Dispatching..." : "Simulate / Send Email"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIMessagesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading AI Messages Workspace...</div>}>
      <AIMessagesContent />
    </Suspense>
  );
}
