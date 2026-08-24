"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";

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
    <header className="flex h-12 w-full items-center justify-between border-b border-border bg-surface px-4 z-20 shrink-0">
      {/* Global Quick Search */}
      <form onSubmit={handleSearchSubmit} className="relative w-72 md:w-80">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            onSearch?.(e.target.value);
          }}
          placeholder="Search creators, niches, channels..."
          className="h-8 w-full rounded border border-border bg-slate-50/70 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none transition"
        />
      </form>

      {/* Right User Bar */}
      <div className="flex items-center gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            S
          </div>
          <span className="hidden sm:inline text-xs font-medium text-slate-700">Shivam</span>
        </div>
      </div>
    </header>
  );
}
