"use client";

import { useEffect, useRef, useState } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { ADMIN_REPORTING_RANGE_OPTIONS, type AdminReportingRange } from "@/lib/adminReportingRanges";
import { utcDateTimeInput, utcDateTimeIso } from "@/lib/adminJourneyDateRange";

/** Used only by operational record directories supporting ISO from/to.
 * Custom UTC bounds appear on their own row, without disturbing the desktop
 * six-control filter bar. The selected range is applied only by the parent form. */
export function AdminOperationalDateRangeFields({
  initialRange,
  initialFrom,
  initialTo,
  now,
  testId,
  legacyOptions = [],
}: {
  initialRange: AdminReportingRange | "today";
  initialFrom: string;
  initialTo: string;
  now: string;
  testId: string;
  legacyOptions?: readonly { value: string; label: string }[];
}) {
  const [range, setRange] = useState<string>(initialRange);
  const [from, setFrom] = useState(utcDateTimeInput(initialFrom));
  const [to, setTo] = useState(utcDateTimeInput(initialTo));
  const lastScope = useRef(JSON.stringify([initialRange, initialFrom, initialTo]));
  const endInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const scope = JSON.stringify([initialRange, initialFrom, initialTo]);
    if (lastScope.current === scope) return;
    lastScope.current = scope;
    setRange(initialRange);
    setFrom(utcDateTimeInput(initialFrom));
    setTo(utcDateTimeInput(initialTo));
  }, [initialRange, initialFrom, initialTo]);
  const custom = range === "custom";
  const start = utcDateTimeIso(from);
  const end = utcDateTimeIso(to);
  const endTime = Date.parse(end);
  const valid = Boolean(start && end && Date.parse(start) < endTime &&
    endTime <= Date.parse(now) && endTime - Date.parse(start) <= 90 * 86400000);
  useEffect(() => {
    if (!custom) return;
    endInputRef.current?.setCustomValidity(valid ? "" : "Choose valid UTC dates within 90 days, with From before To.");
  }, [custom, valid]);
  return <>
    <div data-testid={testId} className="min-w-0">
      <SearchMonitorSelect label="Date range" name="range" value={range}
        options={[...ADMIN_REPORTING_RANGE_OPTIONS, ...legacyOptions]}
        appearance="fare" onValueChange={value => {
          setRange(value);
          if (value === "custom" && range !== "custom" && (!from || !to)) {
            setTo(now.slice(0, 16));
            setFrom(new Date(Date.parse(now) - 7 * 86400000).toISOString().slice(0, 16));
          }
        }} truncateLabel />
    </div>
    {custom ? (
      <div data-testid={testId + "-custom"} className="col-span-full flex min-w-0 flex-wrap items-end gap-3 rounded-lg border border-[#D8E1EC] p-3">
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">From (UTC)
          <input type="datetime-local" required value={from} onChange={event => setFrom(event.target.value)}
            max={to || now.slice(0,16)}
            className="h-10 min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#334155]" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">To (UTC)
          <input ref={endInputRef} type="datetime-local" required value={to} onChange={event => setTo(event.target.value)}
            min={from || undefined} max={now.slice(0,16)}
            className="h-10 min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#334155]" />
        </label>
        <input type="hidden" name="from" value={start} />
        <input type="hidden" name="to" value={end} />
        {!valid ? <span role="alert" className="text-[12px] text-rose-700">
          Choose valid UTC dates within 90 days, with From before To and no future date.
        </span> : null}
      </div>
    ) : null}
  </>;
}
