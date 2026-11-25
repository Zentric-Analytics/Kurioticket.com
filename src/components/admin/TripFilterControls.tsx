"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { useMemo, useState, type KeyboardEvent } from "react";

import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { adminCalendarDateField } from "@/lib/adminLocalTime";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import type { AdminTripFilters } from "@/lib/adminConfirmedTripsDirectory";
import type { AdminTripWorkspaceRange } from "@/lib/adminTripWorkspace";

type Props = {
  filters: AdminTripFilters;
  range: AdminTripWorkspaceRange;
  providerNames: string[];
  timeZone: string;
  timeZoneLabel: string;
  today: string;
};

const productOptions = [
  { value: "all", label: "All" },
  { value: "FLIGHT", label: "Flights" },
  { value: "HOTEL", label: "Hotels" },
  { value: "CAR", label: "Cars" },
  { value: "PACKAGE", label: "Packages" },
] as const;
const statusOptions = [
  // "Confirmed" represents all provider-confirmed records, not a separate lifecycle status.
  { value: "all", label: "Confirmed" },
  // Tracking reporting is not connected: the control must never submit TRACKED.
  { value: "TRACKED", label: "Tracked", disabled: true },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "PAST", label: "Past" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;
const identityOptions = [
  { value: "all", label: "All identities" },
  { value: "registered", label: "Registered" },
  { value: "guest", label: "Guest", disabled: true },
] as const;
const rangeOptions = ADMIN_REPORTING_RANGE_OPTIONS;


const fieldLabel = "block min-w-0 text-[11px] font-medium leading-4 text-slate-700 2xl:text-xs";
const inputClass = "mt-1 block h-9 w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-900 placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 2xl:text-xs";

function keepFiltersDraftUntilApply(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
  }
}

/**
 * One read-only GET form with six compact fields. Calendar ranges use the
 * selected reporting zone. Tracked stays disabled until its reporting source is connected.
 * Dropdowns reuse the accessible popup behavior from Search Activity, but
 * remain draft selections until the administrator explicitly presses Apply.
 */
export function TripFilterControls({ filters, range, providerNames, timeZone, timeZoneLabel, today }: Props) {
  const [selectedRange, setSelectedRange] = useState(range);
  const [customFrom, setCustomFrom] = useState(() => adminCalendarDateField(filters.from, timeZone));
  const [customTo, setCustomTo] = useState(() => adminCalendarDateField(filters.to, timeZone, true));
  const [fromEdited, setFromEdited] = useState(false);
  const [toEdited, setToEdited] = useState(false);
  const preserveFrom = range === "custom" && !fromEdited;
  const preserveTo = range === "custom" && !toEdited;
  const customValid = /^\d{4}-\d{2}-\d{2}$/.test(customFrom) &&
    /^\d{4}-\d{2}-\d{2}$/.test(customTo) && customFrom <= customTo &&
    customTo <= today;
  const providerOptions = useMemo(() => {
    const names = new Set(providerNames.filter(Boolean));
    if (filters.provider) names.add(filters.provider);
    return [
      { value: "", label: "All providers" },
      ...Array.from(names).sort((a, b) => a.localeCompare(b)).map(name => ({ value: name, label: name })),
    ];
  }, [providerNames, filters.provider]);

  return (
    <form method="get" action="/admin/confirmed-trips" aria-label="Filter trip directory" className="min-w-0" onKeyDown={keepFiltersDraftUntilApply}>
      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-2.5">
        <label className={fieldLabel + " w-full sm:w-[180px]"}>
          Search trips
          <input name="q" type="search" defaultValue={filters.q} maxLength={80} placeholder="Search…" title="Search customer, reference, provider or destination" className={inputClass} />
        </label>
        <div className={fieldLabel + " w-full sm:w-[135px]"}>
          <span>Provider</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Provider" name="provider" value={filters.provider} options={providerOptions} appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className={fieldLabel + " w-full sm:w-[110px]"}>
          <span>Travel type</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Travel type" name="product" value={filters.product} options={productOptions} appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className={fieldLabel + " w-full sm:w-[120px]"}>
          <span>Trip status</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Trip status" name="status" value={filters.status} options={statusOptions} appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className={fieldLabel + " w-full sm:w-[135px]"}>
          <span>Identity</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Identity" name="identity" value={filters.identity} options={identityOptions} appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className={fieldLabel + " w-full sm:w-[120px]"}>
          <span>Time range</span>
          <div className="mt-1">
            <SearchMonitorSelect label="Date range" name="range" value={selectedRange} timeZoneLabel={timeZoneLabel}
              onValueChange={value => setSelectedRange(value as AdminTripWorkspaceRange)}
              options={[...rangeOptions, ...(selectedRange === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : [])]}
              appearance="boxed" truncateLabel />
          </div>
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <button type="submit" disabled={selectedRange === "custom" && !customValid}
            className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md bg-indigo-700 px-2.5 text-[11px] font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40">Apply</button>
        </div>
        {selectedRange === "custom" ? <div className="flex w-full min-w-0 flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-slate-700">From ({timeZoneLabel})
            <AdminCalendarInput name="from" timeZone={timeZone} required value={customFrom} max={customTo || today}
              submitValue={preserveFrom ? filters.from : undefined}
              onValueChange={value => { setFromEdited(true); setCustomFrom(value); }} className="w-[210px] max-w-full" />
          </label>
          <label className="text-xs font-medium text-slate-700">To ({timeZoneLabel})
            <AdminCalendarInput name="to" timeZone={timeZone} required value={customTo} min={customFrom || undefined}
              submitValue={preserveTo ? filters.to : undefined}
              max={today} onValueChange={value => { setToEdited(true); setCustomTo(value); }}
              className="w-[210px] max-w-full" />
          </label>
          {!customValid ? <span role="alert" className="text-xs text-rose-700">Choose valid reporting dates with From on or before To.</span> : null}
        </div> : null}
      </div>
    </form>
  );
}
