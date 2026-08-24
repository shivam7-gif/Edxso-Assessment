"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Play,
  Clock,
  ShieldCheck,
  X,
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
    if (confirm("Run safe outreach simulation for all qualified creators? Creators with verified emails will be simulated, and creators without emails will be marked for manual DM.")) {
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
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Outreach Tracker</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit logging, duplicate prevention, and dispatch tracking for influencer messages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportOutreach}
            className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSimulateAll}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
          >
            <Play className={`h-3 w-3 fill-current ${isSimulating ? "animate-spin" : ""}`} />
            <span>{isSimulating ? "Simulating..." : "Simulate All Qualified"}</span>
          </button>
        </div>
      </div>

      {/* Safety Policy Banner */}
      <div className="rounded-lg border border-border bg-slate-50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <ShieldCheck className="h-4 w-4 text-slate-600 shrink-0" />
          <span>
            <strong>Safe Execution Policy:</strong> Default mode is <strong>Simulation</strong>. Outreach is restricted to public emails with automatic deduplication.
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span>Simulated: <strong className="text-slate-900 font-mono">{simulatedCount}</strong></span>
          <span>Live Sent: <strong className="text-slate-900 font-mono">{sentCount}</strong></span>
        </div>
      </div>

      {/* Outreach Activity Log Table */}
      <div className="rounded-lg border border-border bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                <th className="py-2.5 pl-4">Creator</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Niche</th>
                <th className="py-2.5 px-3">Email Subject</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Dispatched</th>
                <th className="py-2.5 pr-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2.5 pl-4 font-medium text-slate-900">
                      {r.creator_name}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700 text-xs">
                      {r.creator_email}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {r.creator_niche}
                    </td>

                    <td className="py-2.5 px-3 text-slate-800 truncate max-w-xs">
                      {r.message_subject || "Collaboration Proposal"}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 border border-slate-200">
                        {r.send_mode}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatTimeAgo(r.sent_at || undefined)}
                    </td>

                    <td className="py-2.5 pr-4 text-right">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]">
          <div className="relative flex h-full w-full max-w-md flex-col bg-white border-l border-border shadow-drawer p-5 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outreach Audit
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedRecord.creator_name}</h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">{selectedRecord.creator_email}</p>
            </div>

            {/* Audit Trail Timeline */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Workflow Event Timeline
              </span>

              <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                <div className="relative">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
                  <span className="text-xs font-medium text-slate-900 block">1. Discovered on YouTube</span>
                  <span className="text-[11px] text-slate-400">Target niche: {selectedRecord.creator_niche}</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-white" />
                  <span className="text-xs font-medium text-slate-900 block">2. Brand Fit Qualified</span>
                  <span className="text-[11px] text-slate-400">100-point rubric completed</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-slate-700 ring-4 ring-white" />
                  <span className="text-xs font-medium text-slate-900 block">3. AI Personalization Generated</span>
                  <span className="text-[11px] text-slate-400">60–90w validated email pitch</span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <span className="text-xs font-medium text-slate-900 block">4. Outreach Executed</span>
                  <span className="text-[11px] text-slate-400">
                    Mode: {selectedRecord.send_mode} ({formatTimeAgo(selectedRecord.sent_at || undefined)})
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                  <span className="text-xs font-medium text-slate-500 block">5. Awaiting Response</span>
                  <span className="text-[11px] text-slate-400">Tracking incoming creator responses</span>
                </div>
              </div>
            </div>

            {/* Email Message Preview */}
            <div className="rounded border border-border bg-slate-50/50 p-3 space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Dispatched Content
              </span>
              <p className="text-xs font-medium text-slate-900">{selectedRecord.message_subject}</p>
              <p className="text-xs text-slate-700 leading-relaxed italic whitespace-pre-wrap">{selectedRecord.message_preview}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
