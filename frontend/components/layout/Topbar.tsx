"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Sparkles, User, RefreshCw } from "lucide-react";

interface TopbarProps {
  onSearch?: (query: string) => void;
}

export function Topbar({ onSearch }: TopbarProps) {
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/influencers?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-border bg-surface px-4 z-20">
      {/* Global Quick Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-96">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search creators, niches, emails... (Press Enter)"
          className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
        />
      </form>

      {/* Right User Bar */}
      <div className="flex items-center gap-3">
        {/* Quick Discovery Button */}
        <button
          onClick={() => router.push("/discovery")}
          className="hidden sm:flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>New AI Discovery</span>
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border text-slate-400 hover:bg-surface-hover hover:text-white transition">
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-surface" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 border-l border-border pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-primary border border-primary/30">
            S
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-none">Shivam</span>
            <span className="text-[10px] text-slate-400 leading-none mt-0.5">Recruiter / Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}
