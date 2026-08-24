"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { startDiscovery, getDiscoveryStatus, clearDatabase } from "@/lib/api";
import { DiscoveryJobState } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const NICHE_PRESETS = [
  "All Technology (Broad)",
  "Artificial Intelligence & LLMs",
  "Programming & Python",
  "Developer Tools & DevOps",
  "Cybersecurity & Infosec",
  "Comedy & Sketches",
  "Fitness & Bodybuilding",
  "Gaming & Streamers",
  "Finance & Investing",
  "Cooking & Recipes",
  "Travel & Lifestyle",
];

function DiscoveryWorkspace() {
  const router = useRouter();

  const [niche, setNiche] = useState("Technology");
  const [customKeyword, setCustomKeyword] = useState("");
  const [targetCount, setTargetCount] = useState(85);
  const [minFollowers, setMinFollowers] = useState(5000);
  const [maxFollowers, setMaxFollowers] = useState(100000);
  const [wipeFirst, setWipeFirst] = useState(false);

  const [jobState, setJobState] = useState<DiscoveryJobState | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let interval: any = null;

    const poll = async () => {
      try {
        const state = await getDiscoveryStatus();
        setJobState(state);
        if (state.status !== "running" && state.status !== "starting") {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling discovery status:", err);
      }
    };

    poll();
    interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [isStarting]);

  const handleStartDiscovery = async () => {
    setIsStarting(true);
    const selectedNiche = customKeyword.trim() ? customKeyword.trim() : (niche === "All Technology (Broad)" ? "all" : niche);
    try {
      await startDiscovery({
        niche: selectedNiche,
        target_count: targetCount,
        min_followers: minFollowers,
        max_followers: maxFollowers,
        wipe_first: wipeFirst,
      });
      const state = await getDiscoveryStatus();
      setJobState(state);
    } catch (err) {
      console.error("Discovery trigger error:", err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleClearDatabase = async () => {
    if (confirm("Are you sure you want to wipe all previous database records for a fresh start?")) {
      await clearDatabase();
      alert("Database and caches cleared successfully.");
      const state = await getDiscoveryStatus();
      setJobState(state);
    }
  };

  const isJobRunning = jobState?.status === "running" || jobState?.status === "starting";

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Discovery Workspace</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Discover real micro-influencers across any niche using YouTube Data API v3.
          </p>
        </div>

        <button
          onClick={handleClearDatabase}
          className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 transition shadow-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Reset Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Configuration Panel */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-3.5 shadow-xs">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-2 border-b border-border">
            Configuration
          </h3>

          {/* Niche Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Target Niche Preset</label>
            <select
              value={niche}
              onChange={(e) => {
                setNiche(e.target.value);
                setCustomKeyword("");
              }}
              disabled={isJobRunning}
              className="h-8 w-full rounded border border-border bg-slate-50/50 px-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-400 focus:outline-none"
            >
              {NICHE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="pt-1">
              <span className="text-[11px] text-slate-400 block mb-1">Or custom keyword:</span>
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="e.g. Python tutorial, Rust, AI..."
                disabled={isJobRunning}
                className="h-8 w-full rounded border border-border bg-slate-50/50 px-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Subscriber Bounds */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Subscriber Range</span>
              <span className="font-mono text-slate-500">5,000 – 100,000</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-border bg-slate-50/50 p-2">
                <span className="text-[10px] text-slate-400 block">Min</span>
                <span className="font-mono text-slate-800 font-semibold">5,000</span>
              </div>
              <div className="rounded border border-border bg-slate-50/50 p-2">
                <span className="text-[10px] text-slate-400 block">Max</span>
                <span className="font-mono text-slate-800 font-semibold">100,000</span>
              </div>
            </div>
          </div>

          {/* Target Count */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Target Count</span>
              <span className="font-mono font-semibold text-slate-900">{targetCount}</span>
            </div>
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={isJobRunning}
              className="w-full accent-slate-900"
            />
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-border space-y-1.5 text-xs">
            <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={wipeFirst}
                onChange={(e) => setWipeFirst(e.target.checked)}
                disabled={isJobRunning}
                className="rounded border-slate-300 text-slate-900"
              />
              <span>Wipe previous records before run</span>
            </label>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDiscovery}
            disabled={isJobRunning || isStarting}
            className="w-full flex items-center justify-center gap-2 rounded bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-xs"
          >
            {isJobRunning ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Discovery Running...</span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>Start YouTube Discovery</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Run Progress */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-white p-4 flex flex-col justify-between space-y-4 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Execution Status
              </h3>
              {jobState?.status && (
                <span className="text-[11px] font-mono font-semibold uppercase text-slate-600">
                  {jobState.status}
                </span>
              )}
            </div>

            {/* Current Step Banner & Progress Bar */}
            <div className="my-3 rounded border border-border bg-slate-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-900">{jobState?.current_step || "Ready"}</span>
                <span className="font-mono font-semibold text-slate-900">{jobState?.progress || 0}%</span>
              </div>

              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${jobState?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {jobState?.steps.map((step) => {
                const isDone = step.status === "completed";
                const isCurrent = step.status === "in_progress";

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs transition ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50/40 text-emerald-800 font-medium"
                        : isCurrent
                        ? "border-slate-400 bg-slate-50 text-slate-900 font-medium"
                        : "border-border bg-white text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Table */}
          {jobState?.discovered_creators && jobState.discovered_creators.length > 0 && (
            <div className="pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Streamed Sample ({jobState.discovered_creators.length})
                </span>
                <button
                  onClick={() => router.push("/influencers")}
                  className="text-xs font-medium text-slate-900 hover:underline flex items-center gap-1"
                >
                  <span>Open in CRM Table</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="rounded border border-border overflow-hidden max-h-40 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-border">
                    <tr>
                      <th className="py-1.5 pl-2.5">Creator</th>
                      <th className="py-1.5 text-right">Followers</th>
                      <th className="py-1.5 pl-2.5">Niche</th>
                      <th className="py-1.5 text-right">Fit Score</th>
                      <th className="py-1.5 pr-2.5 text-right">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {jobState.discovered_creators.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="py-1.5 pl-2.5 font-medium text-slate-900">{c.name}</td>
                        <td className="py-1.5 text-right font-mono text-slate-700">{formatNumber(c.subs)}</td>
                        <td className="py-1.5 pl-2.5 text-slate-600">{c.niche}</td>
                        <td className="py-1.5 text-right font-mono font-semibold text-slate-900">{c.score}</td>
                        <td className="py-1.5 pr-2.5 text-right font-mono text-[11px] text-slate-700">
                          {c.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryPage() {
  return <DiscoveryWorkspace />;
}
