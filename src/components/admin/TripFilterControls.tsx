"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import type { AdminTripFilters } from "@/lib/adminConfirmedTripsDirectory";
import type { AdminTripWorkspaceRange } from "@/lib/adminTripWorkspace";

type Props = {
  filters: AdminTripFilters;
  range: AdminTripWorkspaceRange;
  dateFields: { from: string; to: string };
  providerNames: string[];
};

const productOptions = [
  { value: "all", label: "All types" },
  { value: "FLIGHT", label: "Flights" },
  { value: "HOTEL", label: "Hotels" },
  { value: "CAR", label: "Cars" },
  { value: "PACKAGE", label: "Packages" },
] as const;
const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "PAST", label: "Past" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;
const rangeOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today (UTC)" },
  { value: "7d", label: "Last 7 UTC days" },
  { value: "30d", label: "Last 30 UTC days" },
  { value: "custom", label: "Custom dates" },
] as const;

const fieldLabel = "block min-w-0 text-[11px] font-medium leading-4 text-slate-700 2xl:text-xs";
const inputClass = "mt-1 block h-9 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-900 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 2xl:text-xs";

/**
 * One read-only GET form. Native UTC date fields are real; tracking cannot be
 * selected until the monitoring source exists. Dropdowns use the same
 * keyboard-accessible popup behavior as Search Activity.
 */
export function TripFilterControls({ filters, range, dateFields, providerNames }: Props) {
  const [selectedRange, setSelectedRange] = useState<AdminTripWorkspaceRange>(range);
  const [from, setFrom] = useState(dateFields.from);
  const [to, setTo] = useState(dateFields.to);

  useEffect(() => {
    setSelectedRange(range);
    setFrom(dateFields.from);
    setTo(dateFields.to);
  }, [range, dateFields.from, dateFields.to]);

  const providerOptions = useMemo(() => {
    const names = new Set(providerNames.filter(Boolean));
    if (filters.provider) names.add(filters.provider);
    return [
      { value: "", label: "All providers" },
      ...Array.from(names).sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name })),
    ];
  }, [providerNames, filters.provider]);

  return (
    <form method="get" action="/admin/confirmed-trips" aria-label="Filter trip directory" className="min-w-0">
      <div className="grid min-w-0 grid-cols-1 items-end gap-x-2 gap-y-2.5 sm:grid-cols-2 md:grid-cols-4 lg:gap-x-1.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1.15fr)_minmax(0,1.15fr)] 2xl:gap-x-2.5">
        <label className={fieldLabel}>
          Search trips
          <input name="q" type="search" defaultValue={filters.q} maxLength={80} placeholder="Search…" title="Search customer, reference, provider or destination" className={inputClass} />
        </label>
        <div className={fieldLabel}>
          <span>Provider</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Provider" name="provider" value={filters.provider} options={providerOptions} appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className={fieldLabel}>
          <span>Travel type</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Travel type" name="product" value={filters.product} options={productOptions} appearance="boxed" truncateLabel autoSubmit />
          </div>
        </div>
        <div className={fieldLabel}>
          <span>Trip status</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Trip status" name="status" value={filters.status} options={statusOptions} appearance="boxed" truncateLabel autoSubmit />
          </div>
        </div>
        <div className={fieldLabel}>
          <span>Time range</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Time range" name="range" value={selectedRange} options={rangeOptions} appearance="boxed" truncateLabel autoSubmit
              onValueChange={next => setSelectedRange(next as AdminTripWorkspaceRange)} />
          </div>
        </div>
        <div className={fieldLabel}>
          <span>Tracking</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Tracking" name="tracking" value="unavailable" options={[{ value: "unavailable", label: "Not connected" }]} appearance="boxed" truncateLabel disabled />
          </div>
        </div>
        <label className={fieldLabel}>
          <span title="Confirmed from (UTC)">From (UTC)</span>
          <input type="date" name="from" value={from} onChange={event => { setFrom(event.target.value); setSelectedRange("custom"); }}
            aria-label="Confirmed from (UTC)" title="Filter latest provider confirmation from UTC date"
            className={inputClass + " px-1.5 2xl:px-2"} />
        </label>
        <label className={fieldLabel}>
          <span title="Confirmed to (UTC)">To (UTC)</span>
          <input type="date" name="to" value={to} onChange={event => { setTo(event.target.value); setSelectedRange("custom"); }}
            aria-label="Confirmed to (UTC)" title="Filter latest provider confirmation to UTC date"
            className={inputClass + " px-1.5 2xl:px-2"} />
        </label>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-[11px] leading-4 text-slate-500">
          UTC dates filter signed confirmation timestamps. Tracking and precise minute-level ranges require a future integration.
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/admin/confirmed-trips#trip-directory" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Clear filters</Link>
          <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-700 px-4 text-xs font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Apply filters</button>
        </div>
      </div>
    </form>
  );
}
