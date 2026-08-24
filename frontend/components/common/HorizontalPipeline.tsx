"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Users, CheckCircle2, Mail, Sparkles, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStep {
  id: string;
  label: string;
  count: number;
  subtext: string;
  icon: any;
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
      subtext: "YouTube Crawl",
      icon: Users,
      href: "/discovery",
    },
    {
      id: "qualified",
      label: "Qualified",
      count: funnel?.qualified || 0,
      subtext: "Brand Fit ≥ 70",
      icon: CheckCircle2,
      href: "/influencers?status=QUALIFIED",
    },
    {
      id: "enriched",
      label: "Enriched",
      count: funnel?.enriched || 0,
      subtext: "Emails & Themes",
      icon: Mail,
      href: "/influencers?email_only=true",
    },
    {
      id: "personalized",
      label: "Personalized",
      count: funnel?.personalized || 0,
      subtext: "Groq LLM Pitches",
      icon: Sparkles,
      href: "/messages",
    },
    {
      id: "ready",
      label: "Ready for Outreach",
      count: funnel?.ready_for_outreach || 0,
      subtext: "Verified & Approved",
      icon: Send,
      href: "/outreach",
    },
    {
      id: "sent",
      label: "Sent / Simulated",
      count: funnel?.sent || 0,
      subtext: "Zero Duplicates",
      icon: MessageSquare,
      href: "/outreach",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Outreach Pipeline Funnel</h3>
          <p className="text-xs text-slate-400">Click any stage to filter and inspect creators in that workflow state</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <div
              key={step.id}
              onClick={() => router.push(step.href)}
              className={cn(
                "group relative flex flex-col justify-between rounded-lg border border-border bg-background p-3 cursor-pointer transition-all hover:border-primary/50 hover:bg-surface-raised"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-white transition">
                  {step.label}
                </span>
                <Icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-primary transition" />
              </div>

              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-white">{step.count}</span>
                <span className="text-[10px] text-slate-500">{step.subtext}</span>
              </div>

              {/* Step indicator bar */}
              <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: funnel?.discovered ? `${Math.min(100, (step.count / (funnel.discovered || 1)) * 100)}%` : "0%",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
