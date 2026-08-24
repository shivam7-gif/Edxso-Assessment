"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Users,
  Search,
  Sliders,
  Check,
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

  // Poll discovery status every 1.5 seconds if job is running
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
      // Poll immediately
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Creator Discovery Workspace</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover real micro-influencers across ANY niche using YouTube Data API v3.
          </p>
        </div>

        <button
          onClick={handleClearDatabase}
          className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Wipe Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Discovery Configuration Panel (1 Col) */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Sliders className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Discovery Configuration</h3>
          </div>

          {/* Niche Selection (Supports ANY Niche) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Select or Enter Target Niche
            </label>
            <select
              value={niche}
              onChange={(e) => {
                setNiche(e.target.value);
                setCustomKeyword("");
              }}
              disabled={isJobRunning}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-xs text-white focus:border-primary focus:outline-none"
            >
              {NICHE_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <div className="pt-1">
              <span className="text-[11px] text-slate-400 block mb-1">Or Enter Custom Keyword / Free-form Niche:</span>
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="e.g. Standup Comedy, Calisthenics, Next.js..."
                disabled={isJobRunning}
                className="h-8 w-full rounded-md border border-border bg-background px-3 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Follower Range (Micro-Influencer: 5k - 100k) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Subscriber Bounds</span>
              <span className="text-primary font-mono font-medium">5,000 – 100,000</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-border bg-background p-2">
                <span className="text-[10px] text-slate-400 block">Min Subs</span>
                <span className="font-mono text-white font-semibold">5,000</span>
              </div>
              <div className="rounded-md border border-border bg-background p-2">
                <span className="text-[10px] text-slate-400 block">Max Subs</span>
                <span className="font-mono text-white font-semibold">100,000</span>
              </div>
            </div>
          </div>

          {/* Discovery Candidate Target Count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Target Candidate Count</span>
              <span className="font-mono font-bold text-white">{targetCount} Creators</span>
            </div>
            <input
              type="range"
              min={25}
              max={150}
              step={5}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value))}
              disabled={isJobRunning}
              className="w-full accent-primary"
            />
          </div>

          {/* Options */}
          <div className="pt-2 border-t border-border space-y-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wipeFirst}
                onChange={(e) => setWipeFirst(e.target.checked)}
                disabled={isJobRunning}
                className="rounded border-border bg-background text-primary"
              />
              <span>Wipe previous records before running</span>
            </label>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDiscovery}
            disabled={isJobRunning || isStarting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-primary-hover disabled:opacity-50 transition"
          >
            {isJobRunning ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Discovery Running...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start YouTube Discovery</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Live Run Progress Experience (2 Cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-white">Live Discovery Execution</h3>
              </div>
              {jobState?.status && (
                <span className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-[11px] font-mono font-bold uppercase text-slate-300">
                  Status: {jobState.status}
                </span>
              )}
            </div>

            {/* Current Step Banner & Progress Bar */}
            <div className="my-4 rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{jobState?.current_step || "Ready to discover"}</span>
                <span className="font-mono font-bold text-primary">{jobState?.progress || 0}%</span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                  style={{ width: `${jobState?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jobState?.steps.map((step) => {
                const isDone = step.status === "completed";
                const isCurrent = step.status === "in_progress";

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition ${
                      isDone
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                        : isCurrent
                        ? "border-primary/40 bg-primary/5 text-white"
                        : "border-border bg-background text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                    <span className="font-medium">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-time discovered preview table */}
          {jobState?.discovered_creators && jobState.discovered_creators.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Discovered Sample ({jobState.discovered_creators.length} Creators Streamed)
                </span>
                <button
                  onClick={() => router.push("/influencers")}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Open in CRM Table</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="rounded-lg border border-border bg-background overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-raised text-[10px] uppercase font-bold text-slate-400 border-b border-border">
                    <tr>
                      <th className="py-2 pl-3">Creator Name</th>
                      <th className="py-2">Followers</th>
                      <th className="py-2">Niche</th>
                      <th className="py-2">Brand Fit</th>
                      <th className="py-2 pr-3 text-right">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {jobState.discovered_creators.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-raised transition">
                        <td className="py-2 pl-3 font-medium text-white">{c.name}</td>
                        <td className="py-2 font-mono text-slate-300">{formatNumber(c.subs)}</td>
                        <td className="py-2 text-slate-400">{c.niche}</td>
                        <td className="py-2 font-mono font-bold text-primary">{c.score}</td>
                        <td className="py-2 pr-3 text-right font-mono text-[11px] text-cyan-400">
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
