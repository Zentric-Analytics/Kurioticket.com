"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { readRecentSearches, type RecentSearchEntry } from "@/lib/recent-searches";

export function RecentSearches() {
  const [entries, setEntries] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    setEntries(readRecentSearches());
  }, []);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Recent searches</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={entry.href}
            className="focus-ring min-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:border-slate-300 hover:bg-white"
          >
            <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {entry.type === "flight" ? "Flight" : "Hotel"}
            </span>
            <span className="block text-sm font-medium text-slate-900">{entry.label}</span>
            <span className="block text-xs text-slate-600">{entry.subtitle}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
