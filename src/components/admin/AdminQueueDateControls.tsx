"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { AdminDirectorySelect } from "./AdminDirectorySelect";
import {
  adminQueueRangeOptions,
  type AdminQueueRange,
} from "@/lib/adminQueueDateRange";

export function AdminQueueDateSelect({
  range,
  timeZoneLabel,
  onChange,
}: {
  range: AdminQueueRange;
  timeZoneLabel: string;
  onChange: (value: AdminQueueRange) => void;
}) {
  return (
    <div data-testid="admin-queue-date-range" className="min-w-0">
      <AdminDirectorySelect name="range" label="Date range" value={range}
        options={range === "24h" ? [...adminQueueRangeOptions, { value: "24h", label: "Last 24 hours" }] : adminQueueRangeOptions}
        timeZoneLabel={timeZoneLabel} compact
        onValueChange={value => onChange(value as AdminQueueRange)} />
    </div>
  );
}

/** Extra inputs appear beneath the normal single-row toolbar only for Custom. */
export function AdminQueueCustomDates({
  range,
  from,
  to,
  timeZone,
  timeZoneLabel,
  setFrom,
  setTo,
  error,
}: {
  range: AdminQueueRange;
  from: string;
  to: string;
  timeZone: string;
  timeZoneLabel: string;
  setFrom: (next: string) => void;
  setTo: (next: string) => void;
  error: string | null;
}) {
  if (range !== "custom") return null;
  return (
    <div data-testid="admin-queue-custom-dates" className="mt-2 flex min-w-0 flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569]">
        From ({timeZoneLabel})
        <AdminCalendarInput mode="datetime-local" timeZone={timeZone} value={from} onChange={event => setFrom(event.target.value)}
          className="w-[210px] max-w-full" />
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569]">
        To ({timeZoneLabel})
        <AdminCalendarInput mode="datetime-local" timeZone={timeZone} value={to} onChange={event => setTo(event.target.value)}
          className="w-[210px] max-w-full" />
      </label>
      {error ? <p role="alert" className="text-[12px] font-medium text-rose-700">{error}</p> : null}
    </div>
  );
}
