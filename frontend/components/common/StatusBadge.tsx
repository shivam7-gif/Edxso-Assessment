import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let style = "bg-slate-800 text-slate-300 border-slate-700";

  if (normalized === "QUALIFIED" || normalized === "VALID" || normalized === "DELIVERED" || normalized === "ACTIVE") {
    style = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (normalized === "REVIEW" || normalized === "MANUAL_REVIEW" || normalized === "PENDING") {
    style = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (normalized === "REJECTED" || normalized === "FAILED" || normalized === "BOUNCED") {
    style = "bg-rose-500/10 text-rose-400 border-rose-500/30";
  } else if (normalized === "SENT" || normalized === "SIMULATED" || normalized === "APPROVED") {
    style = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
  } else if (normalized === "CONTACTED" || normalized === "READY") {
    style = "bg-blue-500/10 text-blue-400 border-blue-500/30";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border tracking-wide uppercase",
        style,
        className
      )}
    >
      {normalized}
    </span>
  );
}
