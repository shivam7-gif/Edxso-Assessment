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
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between rounded-lg border border-border bg-white p-3.5 transition-colors",
        onClick && "cursor-pointer hover:border-slate-300 hover:bg-slate-50/50",
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      </div>

      <div className="my-1.5">
        <div className="text-xl font-semibold tracking-tight text-slate-900">{value}</div>
      </div>

      {(subtext || badge) && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          {subtext && <span className="truncate">{subtext}</span>}
          {badge && (
            <span className="shrink-0 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
