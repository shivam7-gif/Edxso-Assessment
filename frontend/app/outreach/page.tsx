"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Download,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Mail,
  RefreshCw,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getOutreach, simulateAllOutreach } from "@/lib/api";
import { Outreach } from "@/lib/types";
import { formatNumber, formatTimeAgo } from "@/lib/utils";

export default function OutreachPage() {
  const [records, setRecords] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Outreach | null>(null);

  const fetchOutreachList = async () => {
    setLoading(true);
    try {
      const res = await getOutreach();
      setRecords(res.items);
    } catch (err) {
      console.error("Error fetching outreach records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreachList();
  }, []);

  const handleSimulateAll = async () => {
    if (confirm("Run safe outreach simulation for all qualified creators with verified emails? Zero duplicate emails will be sent.")) {
      setIsSimulating(true);
      try {
        const res = await simulateAllOutreach();
        alert(`Simulation complete! Processed ${res.results?.length || 0} outreach records.`);
        fetchOutreachList();
      } catch (err) {
        alert(`Simulation error: ${err}`);
      } finally {
        setIsSimulating(false);
      }
    }
  };

  const handleExportOutreach = () => {
    window.open("http://127.0.0.1:8000/api/exports/outreach.csv", "_blank");
  };

  const simulatedCount = records.filter((r) => r.status === "SIMULATED").length;
  const sentCount = records.filter((r) => r.status === "SENT").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Outreach & Activity Tracker</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logging, duplicate prevention, and dispatch tracking for automated influencer messages.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportOutreach}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-raised hover:text-white transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSimulateAll}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-primary-hover disabled:opacity-50 transition"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Simulating..." : "Simulate All Qualified"}</span>
          </button>
        </div>
      </div>

      {/* Safety & Policy Banner */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Safe Outreach Execution Policy
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Default mode is <strong>Simulation</strong>. Outreach is restricted to verified emails, zero fabricated contacts, and automated deduplication against SQLite database.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Simulated Records</span>
            <span className="font-mono font-bold text-cyan-400">{simulatedCount}</span>
          </div>
          <div className="text-right border-l border-border pl-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Live Sent</span>
            <span className="font-mono font-bold text-emerald-400">{sentCount}</span>
          </div>
        </div>
      </div>

      {/* Outreach Activity Log Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="py-3 pl-4">Creator</th>
                <th className="py-3 px-2">Verified Email</th>
                <th className="py-3 px-2">Niche</th>
                <th className="py-3 px-2">Email Subject</th>
                <th className="py-3 px-2">Mode</th>
                <th className="py-3 px-2">Dispatched At</th>
                <th className="py-3 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading outreach audit records...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="table-row-hover cursor-pointer transition"
                  >
                    <td className="py-3 pl-4 font-semibold text-white">
                      {r.creator_name}
                    </td>

                    <td className="py-3 px-2 font-mono text-cyan-400 text-[11px]">
                      {r.creator_email}
                    </td>

                    <td className="py-3 px-2 text-slate-400">
                      {r.creator_niche}
                    </td>

                    <td className="py-3 px-2 text-slate-300 font-medium line-clamp-1 max-w-xs">
                      {r.message_subject || "Collaboration Proposal"}
                    </td>

                    <td className="py-3 px-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300 border border-slate-700">
                        {r.send_mode}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-slate-400 text-[11px]">
                      {formatTimeAgo(r.sent_at || undefined)}
                    </td>

                    <td className="py-3 pr-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No outreach dispatched yet. Click "Simulate All Qualified" to run safe batch dispatch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-In Timeline Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex h-full w-full max-w-md flex-col bg-surface border-l border-border shadow-2xl p-6 overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Outreach Audit Details
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{selectedRecord.creator_name}</h3>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">{selectedRecord.creator_email}</p>
            </div>

            {/* Audit Trail Timeline */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Workflow Event Timeline
              </span>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-surface" />
                  <span className="text-xs font-semibold text-white block">1. Discovered on YouTube</span>
                  <span className="text-[11px] text-slate-400">Target niche: {selectedRecord.creator_niche}</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-surface" />
                  <span className="text-xs font-semibold text-white block">2. Brand Fit Qualified</span>
                  <span className="text-[11px] text-slate-400">100-point rubric completed with public engagement proxy</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-accent ring-4 ring-surface" />
                  <span className="text-xs font-semibold text-white block">3. AI Personalization Generated</span>
                  <span className="text-[11px] text-slate-400">Groq LLM 60-90w email pitch validated</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-cyan-400 ring-4 ring-surface" />
                  <span className="text-xs font-semibold text-white block">4. Outreach Executed</span>
                  <span className="text-[11px] text-slate-400">
                    Mode: {selectedRecord.send_mode} ({formatTimeAgo(selectedRecord.sent_at || undefined)})
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-slate-600 ring-4 ring-surface" />
                  <span className="text-xs font-semibold text-slate-400 block">5. Awaiting Response</span>
                  <span className="text-[11px] text-slate-500">Tracking incoming creator responses</span>
                </div>
              </div>
            </div>

            {/* Email Message Preview */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Dispatched Pitch Content
              </span>
              <p className="text-xs font-semibold text-white">{selectedRecord.message_subject}</p>
              <p className="text-xs text-slate-300 leading-relaxed italic">{selectedRecord.message_preview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
