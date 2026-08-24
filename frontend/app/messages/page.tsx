"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  RefreshCw,
  Edit3,
  Check,
  Send,
  Copy,
  Mail,
  User,
  Sparkles,
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
      fetchMessagesList();
    } catch (err: any) {
      alert(`Error regenerating message: ${err.message || err}`);
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
    } catch (err: any) {
      alert(`Error saving edits: ${err.message || err}`);
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
    } catch (err: any) {
      alert(`Error approving message: ${err.message || err}`);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedMessage) return;
    setIsSending(true);
    try {
      const res = await sendSingleOutreach(selectedMessage.influencer_id);
      alert(`Outreach recorded (Status: ${res.status}, Mode: ${res.send_mode}).`);
      fetchMessagesList();
    } catch (err: any) {
      alert(`Outreach error: ${err.message || err}`);
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

  return (
    <div className="space-y-4 pb-12">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Personalization Studio</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, edit, and approve hyper-personalized pitches powered by Groq LLM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {messages.length} Pitches ({validCount} Validated)
          </span>
        </div>
      </div>

      {/* Main Split-Screen Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px]">
        {/* Col 1: Creator Selection List (3 Cols) */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-white p-3 flex flex-col shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Creators ({messages.length})
            </span>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto max-h-[600px] pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading pitches...</div>
            ) : messages.length > 0 ? (
              messages.map((m) => {
                const isSelected = selectedMessage?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMessage(m)}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-slate-900 bg-slate-100/70"
                        : "border-border bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-900 truncate max-w-[140px]">
                        {m.creator_name || `Creator #${m.influencer_id}`}
                      </span>
                      <StatusBadge status={m.validation_status} />
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>{m.creator_niche}</span>
                      <span className="font-mono">{m.email_word_count}w</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No personalized pitches generated yet.
              </div>
            )}
          </div>
        </div>

        {/* Col 2: Creator Context Panel (4 Cols) */}
        <div className="lg:col-span-4 rounded-lg border border-border bg-white p-4 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <User className="h-3 w-3 text-slate-500" />
                <span>Creator Context</span>
              </span>
              {creatorDetail && <StatusBadge status={creatorDetail.status} />}
            </div>

            {creatorDetail ? (
              <div className="space-y-3 pt-3">
                {/* Creator Header */}
                <div className="rounded border border-border bg-slate-50/50 p-2.5">
                  <h3 className="text-sm font-semibold text-slate-900">{creatorDetail.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{creatorDetail.niche}</span>
                    <span>·</span>
                    <span className="font-mono">{formatNumber(creatorDetail.followers)} Subs</span>
                    <span>·</span>
                    <span className="font-semibold text-slate-800">Score {creatorDetail.brand_fit_score}</span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono mt-1">
                    {creatorDetail.email !== "Not Found" ? creatorDetail.email : "Email: Not Found"}
                  </div>
                </div>

                {/* Collaboration Angle */}
                <div className="rounded border border-border bg-slate-50/50 p-2.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-0.5">
                    Angle
                  </span>
                  <p className="text-xs font-medium text-slate-900">{selectedMessage?.collaboration_angle}</p>
                </div>

                {/* Referenced Signals */}
                <div className="rounded border border-border bg-slate-50/50 p-2.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                    Referenced Video Evidence
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {selectedMessage?.personalization_signals.map((sig, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-slate-400 font-bold mt-0.5">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recent Video Contexts */}
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1.5">
                    Recent Videos ({creatorDetail.recent_videos?.length || 0})
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {creatorDetail.recent_videos?.map((v, i) => (
                      <div key={i} className="rounded border border-border bg-slate-50/30 p-2 text-xs">
                        <div className="font-medium text-slate-900 truncate">{v.title}</div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5 font-mono">
                          <span>{formatNumber(v.views)} views</span>
                          <span>{formatNumber(v.likes)} likes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Select a creator to view context.</div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-border font-mono">
            Model: {selectedMessage?.model || "groq/llama-3.3-70b-versatile"}
          </div>
        </div>

        {/* Col 3: Generated Outreach Split-Screen Review & Editor (5 Cols) */}
        <div className="lg:col-span-5 rounded-lg border border-border bg-white p-4 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Outreach Recommendation
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRegenerate}
                  disabled={isRegenerating || !selectedMessage}
                  className="flex items-center gap-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                  title="Re-prompt LLM"
                >
                  <RefreshCw className={`h-3 w-3 ${isRegenerating ? "animate-spin" : ""}`} />
                  <span>Regenerate</span>
                </button>

                <button
                  onClick={handleSaveEdits}
                  disabled={isSaving || !selectedMessage}
                  className="flex items-center gap-1 rounded border border-border bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Save Edits</span>
                </button>
              </div>
            </div>

            {selectedMessage ? (
              <div className="space-y-3 pt-3">
                {/* Email Subject Line */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-600">Email Subject</label>
                    <button
                      onClick={() => handleCopy(subject, "subject")}
                      className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1"
                    >
                      {copiedField === "subject" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded border border-border bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                {/* Email Pitch Body */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-600">Collaboration Email Pitch</label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          isEmailLengthValid ? "text-emerald-700" : "text-amber-600"
                        }`}
                      >
                        {emailWords} words {isEmailLengthValid ? "(Valid 60–90w)" : "(Target: 60–90w)"}
                      </span>
                      <button
                        onClick={() => handleCopy(emailBody, "emailBody")}
                        className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1"
                      >
                        {copiedField === "emailBody" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full rounded border border-border bg-slate-50/50 p-2.5 text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-slate-400 focus:outline-none"
                  />
                </div>

                {/* Instagram Direct Message */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-slate-600">Instagram Direct Message</label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-medium ${
                          isDmLengthValid ? "text-emerald-700" : "text-amber-600"
                        }`}
                      >
                        {dmWords} words {isDmLengthValid ? "(Valid 15–30w)" : "(Target: 15–30w)"}
                      </span>
                      <button
                        onClick={() => handleCopy(instagramDm, "dm")}
                        className="text-slate-400 hover:text-slate-700 text-[10px] flex items-center gap-1"
                      >
                        {copiedField === "dm" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
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
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Select a message from the left list.</div>
            )}
          </div>

          {/* Action Dispatch Buttons */}
          {selectedMessage && (
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-1.5 rounded border border-border bg-white py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>

              <button
                onClick={handleSendSingle}
                disabled={isSending}
                className="flex-1 flex items-center justify-center gap-1.5 rounded bg-slate-900 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Dispatching..." : "Simulate / Send"}</span>
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading AI Messages...</div>}>
      <AIMessagesContent />
    </Suspense>
  );
}
