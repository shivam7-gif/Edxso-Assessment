"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Compass,
  Sparkles,
  Layers,
  Send,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Influencers", href: "/influencers", icon: Users },
  { label: "Discovery", href: "/discovery", icon: Compass },
  { label: "AI Messages", href: "/messages", icon: Sparkles },
  { label: "Campaigns", href: "/campaigns", icon: Layers },
  { label: "Outreach", href: "/outreach", icon: Send },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-surface transition-all duration-200 select-none z-30 shrink-0",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Workspace Header - Clean typography without logo box */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-border">
        {!collapsed ? (
          <Link href="/" className="flex flex-col min-w-0 px-1">
            <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
              CreatorFlow CRM
            </span>
            <span className="text-[10px] text-slate-400 -mt-0.5 truncate">
              Influencer Outreach
            </span>
          </Link>
        ) : (
          <span className="mx-auto text-xs font-bold text-slate-900">CF</span>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation Group */}
      <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
        <div className={cn("px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400", collapsed && "sr-only")}>
          Workspace
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700")} />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Settings Link */}
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
            pathname === "/settings"
              ? "bg-slate-100 text-slate-900 font-semibold"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
          )}
          title={collapsed ? "Settings & APIs" : undefined}
        >
          <Settings className={cn("h-4 w-4 shrink-0", pathname === "/settings" ? "text-slate-900" : "text-slate-400 group-hover:text-slate-700")} />
          {!collapsed && <span className="truncate">Settings & APIs</span>}
        </Link>
      </div>
    </aside>
  );
}
