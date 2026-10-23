"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, RefreshCw, Server } from "lucide-react";

export type OverviewRange = "24h" | "7d" | "30d";

const rangeLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export function AdminOverviewControls({
  environment,
  from,
  to,
  range,
}: {
  environment: string;
  from: string;
  to: string;
  range: OverviewRange;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const updated = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(to));

  return (
    <div className="mb-6 flex w-full flex-wrap items-stretch justify-start gap-2 lg:justify-end" aria-label="Overview reporting controls">
      <div className="flex min-w-[134px] flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-[11px] font-semibold text-slate-500">Environment</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs font-bold capitalize text-slate-800">
          <Server size={14} className="text-indigo-600" aria-hidden="true" />
          {environment}
        </span>
      </div>
      <label className="flex min-w-[164px] flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-[11px] font-semibold text-slate-500">Reporting range</span>
        <span className="mt-1 flex items-center gap-1.5">
          <CalendarDays size={14} className="shrink-0 text-indigo-600" aria-hidden="true" />
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
            className="min-w-0 flex-1 cursor-pointer bg-transparent text-xs font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            {(Object.keys(rangeLabels) as OverviewRange[]).map((key) => (
              <option key={key} value={key}>{rangeLabels[key]}</option>
            ))}
          </select>
        </span>
      </label>
      <div className="flex min-w-[203px] flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm" title={"Reporting period: " + from + " to " + to}>
        <span className="text-[11px] font-semibold text-slate-500">Snapshot checked</span>
        <time dateTime={to} className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-slate-800">
          <Clock3 size={14} className="text-indigo-600" aria-hidden="true" />
          {updated} UTC
        </time>
      </div>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshCw size={15} className={pending ? "animate-spin" : ""} aria-hidden="true" />
        {pending ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
