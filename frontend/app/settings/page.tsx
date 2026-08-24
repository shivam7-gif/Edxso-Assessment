"use client";

import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Database,
  Key,
  Cpu,
  Mail,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { getSettingsData, clearDatabase } from "@/lib/api";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettingsData();
      setSettings(data);
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleClearDb = async () => {
    if (confirm("Are you sure you want to wipe the SQLite database and raw caches? This cannot be undone.")) {
      await clearDatabase();
      alert("Database and caches cleared successfully.");
      fetchSettings();
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & APIs</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnostics, active LLM model configuration, and database controls.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-surface-raised hover:text-white transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* API Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* YouTube API Card */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">YouTube Data API v3</h3>
            </div>
            {settings?.youtube_api.status === "connected" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/30">
                <AlertCircle className="h-3 w-3" /> Missing Key
              </span>
            )}
          </div>

          <div className="text-xs space-y-2 text-slate-300">
            <div>
              <span className="text-slate-500 block">Configured API Key:</span>
              <span className="font-mono text-slate-200 mt-0.5 block">{settings?.youtube_api.key_masked}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Discovery Quota & Limits:</span>
              <span className="text-slate-300 mt-0.5 block">50 channels/page, video statistics batching enabled</span>
            </div>
          </div>
        </div>

        {/* Groq LLM Card */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-white">Groq AI Inference</h3>
            </div>
            {settings?.groq_api.status === "connected" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/30">
                <AlertCircle className="h-3 w-3" /> Missing Key
              </span>
            )}
          </div>

          <div className="text-xs space-y-2 text-slate-300">
            <div>
              <span className="text-slate-500 block">Active Reasoning Model:</span>
              <span className="font-mono text-cyan-400 font-bold mt-0.5 block">{settings?.groq_api.model}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Key Mask:</span>
              <span className="font-mono text-slate-200 mt-0.5 block">{settings?.groq_api.key_masked}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Diagnostics & Exports */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Local SQLite Persistence</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{settings?.database.url}</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-slate-500 block uppercase text-[10px] font-bold">Influencers</span>
            <span className="text-lg font-bold text-white mt-1 block">{settings?.database.influencer_count}</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-slate-500 block uppercase text-[10px] font-bold">Personalizations</span>
            <span className="text-lg font-bold text-white mt-1 block">{settings?.database.message_count}</span>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <span className="text-slate-500 block uppercase text-[10px] font-bold">Outreach Log</span>
            <span className="text-lg font-bold text-white mt-1 block">{settings?.database.outreach_count}</span>
          </div>
        </div>

        {/* CSV Direct Downloads */}
        <div className="pt-2 border-t border-border space-y-2">
          <span className="text-xs font-semibold text-slate-300 block">Export Pipeline Artifacts</span>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="http://127.0.0.1:8000/api/exports/influencers.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-slate-300 hover:border-primary hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download influencers.csv</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/exports/messages.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-slate-300 hover:border-primary hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download messages.csv</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/exports/outreach.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-slate-300 hover:border-primary hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download outreach.csv</span>
            </a>
          </div>
        </div>

        {/* Wipe Database Action */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-400 block">Wipe & Reset Workspace Database</span>
            <span className="text-[11px] text-slate-500 block">Clears SQLite records and discovery caches for fresh execution.</span>
          </div>

          <button
            onClick={handleClearDb}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Database</span>
          </button>
        </div>
      </div>
    </div>
  );
}
