import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let style = "bg-slate-50 text-slate-600 border-slate-200";

  if (normalized === "QUALIFIED" || normalized === "VALID" || normalized === "DELIVERED" || normalized === "ACTIVE") {
    style = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (normalized === "REVIEW" || normalized === "MANUAL_REVIEW" || normalized === "PENDING") {
    style = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (normalized === "REJECTED" || normalized === "FAILED" || normalized === "BOUNCED") {
    style = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (normalized === "SENT" || normalized === "SIMULATED" || normalized === "APPROVED") {
    style = "bg-sky-50 text-sky-700 border-sky-200";
  } else if (normalized === "SKIPPED_NO_EMAIL") {
    style = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium border",
        style,
        className
      )}
    >
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        normalized === "QUALIFIED" || normalized === "VALID" ? "bg-emerald-500" :
        normalized === "REVIEW" || normalized === "MANUAL_REVIEW" ? "bg-amber-500" :
        normalized === "REJECTED" || normalized === "FAILED" ? "bg-rose-500" :
        normalized === "SENT" || normalized === "SIMULATED" ? "bg-sky-500" : "bg-slate-400"
      )} />
      <span>{normalized}</span>
    </span>
  );
}
