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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Influencers", href: "/influencers", icon: Users },
  { label: "Discovery", href: "/discovery", icon: Compass, badge: "AI" },
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
        "flex flex-col border-r border-border bg-surface transition-all duration-300 select-none z-30",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-md">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">
                CreatorFlow <span className="text-primary">AI</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 -mt-0.5">
                Influencer Outreach CRM
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Zap className="h-4 w-4 fill-current" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-surface-hover hover:text-white transition",
            collapsed && "mx-auto mt-2"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        <div className={cn("px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300", collapsed && "sr-only")}>
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
                "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-200 hover:bg-surface-hover hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary-hover uppercase border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Settings Link */}
      <div className="border-t border-border p-2">
        <Link
          href="/settings"
          className={cn(
            "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-white"
              : "text-slate-300 hover:bg-surface-hover hover:text-white"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-white" />
          {!collapsed && <span>Settings & APIs</span>}
        </Link>
      </div>
    </aside>
  );
}
