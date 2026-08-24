import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeType?: "success" | "warning" | "info" | "neutral";
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtext,
  badge,
  badgeType = "info",
  icon: Icon,
  onClick,
  className,
}: MetricCardProps) {
  const badgeStyles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    neutral: "bg-slate-800 text-slate-400 border-slate-700",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:bg-surface-raised",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-slate-300 border border-border">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="my-2">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
      </div>

      <div className="flex items-center justify-between text-xs">
        {subtext && <span className="text-slate-400 text-[11px]">{subtext}</span>}
        {badge && (
          <span
            className={cn(
              "ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border",
              badgeStyles[badgeType]
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
