"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Database,
  Key,
  Cpu,
  Download,
  Trash2,
  RefreshCw,
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
    <div className="space-y-4 pb-12 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings & APIs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostics, active LLM model configuration, and database controls.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* API Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* YouTube API Card */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-700" />
              <h3 className="text-xs font-semibold text-slate-900">YouTube Data API v3</h3>
            </div>
            {settings?.youtube_api.status === "connected" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                <AlertCircle className="h-3 w-3" /> Missing Key
              </span>
            )}
          </div>

          <div className="text-xs space-y-1 text-slate-600">
            <div>
              <span className="text-slate-400 text-[11px] block">API Key:</span>
              <span className="font-mono text-slate-800 text-xs">{settings?.youtube_api.key_masked}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Quota Strategy:</span>
              <span className="text-slate-700 text-[11px]">50 channels/page batch retrieval enabled</span>
            </div>
          </div>
        </div>

        {/* Groq LLM Card */}
        <div className="rounded-lg border border-border bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-slate-700" />
              <h3 className="text-xs font-semibold text-slate-900">Groq AI Inference</h3>
            </div>
            {settings?.groq_api.status === "connected" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                <AlertCircle className="h-3 w-3" /> Missing Key
              </span>
            )}
          </div>

          <div className="text-xs space-y-1 text-slate-600">
            <div>
              <span className="text-slate-400 text-[11px] block">Model:</span>
              <span className="font-mono text-slate-800 text-xs font-semibold">{settings?.groq_api.model}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Key Mask:</span>
              <span className="font-mono text-slate-800 text-xs">{settings?.groq_api.key_masked}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Diagnostics & Exports */}
      <div className="rounded-lg border border-border bg-white p-4 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-semibold text-slate-900">SQLite Persistence</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{settings?.database.url}</span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border rounded border border-border bg-slate-50/50 text-center py-2">
          <div className="px-2">
            <span className="text-slate-400 block uppercase text-[10px] font-medium">Influencers</span>
            <span className="text-base font-semibold text-slate-900 mt-0.5 block">{settings?.database.influencer_count}</span>
          </div>
          <div className="px-2">
            <span className="text-slate-400 block uppercase text-[10px] font-medium">Personalizations</span>
            <span className="text-base font-semibold text-slate-900 mt-0.5 block">{settings?.database.message_count}</span>
          </div>
          <div className="px-2">
            <span className="text-slate-400 block uppercase text-[10px] font-medium">Outreach Log</span>
            <span className="text-base font-semibold text-slate-900 mt-0.5 block">{settings?.database.outreach_count}</span>
          </div>
        </div>

        {/* CSV Direct Downloads */}
        <div className="pt-2 border-t border-border space-y-1.5">
          <span className="text-xs font-medium text-slate-700 block">Export Pipeline CSVs</span>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="http://127.0.0.1:8000/api/exports/influencers.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3 w-3 text-slate-400" />
              <span>influencers.csv</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/exports/messages.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3 w-3 text-slate-400" />
              <span>messages.csv</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/exports/outreach.csv"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded border border-border bg-white px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 transition"
            >
              <Download className="h-3 w-3 text-slate-400" />
              <span>outreach.csv</span>
            </a>
          </div>
        </div>

        {/* Wipe Database Action */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-rose-700 block">Reset Workspace Database</span>
            <span className="text-[11px] text-slate-400 block">Clears SQLite records and discovery caches for fresh run.</span>
          </div>

          <button
            onClick={handleClearDb}
            className="flex items-center gap-1.5 rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Database</span>
          </button>
        </div>
      </div>
    </div>
  );
}
