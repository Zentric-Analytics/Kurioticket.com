"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

export type OverviewRange = "24h" | "7d" | "30d";

const rangeLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

// Keep the established one-minute refresh even though the visible top toolbar
// has been removed. Historical aggregates are still fetched from the server.
export function AdminOverviewAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

// The range belongs to the Operations Snapshot heading, not a separate toolbar.
export function AdminOverviewRangeSelect({ range }: { range: OverviewRange }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <CalendarDays size={15} className="shrink-0 text-indigo-600" aria-hidden="true" />
      <span className="sr-only">Reporting range</span>
      <select
        aria-label="Overview reporting range"
        value={range}
        disabled={pending}
        onChange={(event) => {
          const nextRange = event.currentTarget.value as OverviewRange;
          startTransition(() => {
            router.push(nextRange === "7d" ? "/admin" : "/admin?range=" + encodeURIComponent(nextRange));
          });
        }}
        className="min-w-0 cursor-pointer appearance-none bg-transparent pr-1 text-xs font-semibold text-slate-800 outline-none disabled:cursor-wait disabled:opacity-60 sm:text-[13px]"
      >
        {(Object.keys(rangeLabels) as OverviewRange[]).map((key) => (
          <option key={key} value={key}>{rangeLabels[key]}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none shrink-0 text-slate-500" aria-hidden="true" />
    </label>
  );
}
