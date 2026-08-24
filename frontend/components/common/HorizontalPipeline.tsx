"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  id: string;
  label: string;
  count: number;
  subtext: string;
  href: string;
}

interface HorizontalPipelineProps {
  funnel?: {
    discovered: number;
    qualified: number;
    enriched: number;
    personalized: number;
    ready_for_outreach: number;
    sent: number;
  };
}

export function HorizontalPipeline({ funnel }: HorizontalPipelineProps) {
  const router = useRouter();

  const steps: PipelineStep[] = [
    {
      id: "discovered",
      label: "Discovered",
      count: funnel?.discovered || 0,
      subtext: "YouTube Pool",
      href: "/discovery",
    },
    {
      id: "qualified",
      label: "Qualified",
      count: funnel?.qualified || 0,
      subtext: "Brand Fit ≥ 70",
      href: "/influencers?status=QUALIFIED",
    },
    {
      id: "enriched",
      label: "Public Emails",
      count: funnel?.enriched || 0,
      subtext: "Found Emails",
      href: "/influencers?email_only=true",
    },
    {
      id: "personalized",
      label: "Personalized",
      count: funnel?.personalized || 0,
      subtext: "AI Pitches",
      href: "/messages",
    },
    {
      id: "ready",
      label: "Ready to Send",
      count: funnel?.ready_for_outreach || 0,
      subtext: "Approved",
      href: "/outreach",
    },
    {
      id: "sent",
      label: "Dispatched",
      count: funnel?.sent || 0,
      subtext: "Sent / Simulated",
      href: "/outreach",
    },
  ];

  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Conversion Pipeline
        </span>
        <span className="text-[11px] text-slate-400">
          {funnel?.discovered || 0} Total Discovered Candidates
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            onClick={() => router.push(step.href)}
            className="group relative flex flex-col justify-between rounded border border-border/80 bg-slate-50/50 p-2.5 hover:bg-slate-50 hover:border-slate-300 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">{step.label}</span>
              <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
            </div>
            <div className="mt-1">
              <span className="text-base font-semibold text-slate-900">{step.count}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{step.subtext}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
