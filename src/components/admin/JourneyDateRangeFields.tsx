"use client";

import { useEffect, useState } from "react";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import { type JourneyDateRange } from "@/lib/adminJourneyDateRange";
import { adminOffsetZonedDateTime, adminZonedDateTimeInput, adminZonedDateTimeIso } from "@/lib/adminTimeZone";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";

export function JourneyDateRangeFields({ initialRange, initialFrom, initialTo, now }: {
  initialRange: JourneyDateRange; initialFrom: string; initialTo: string; now: string;
}) {
  const timeZone = useAdminTimeZone();
  const localNow = adminZonedDateTimeInput(now, timeZone);
  const [range, setRange] = useState<JourneyDateRange>(initialRange);
  const [from, setFrom] = useState(adminZonedDateTimeInput(initialFrom, "UTC"));
  const [to, setTo] = useState(adminZonedDateTimeInput(initialTo, "UTC"));
  useEffect(() => {
    setFrom(adminZonedDateTimeInput(initialFrom, timeZone));
    setTo(adminZonedDateTimeInput(initialTo, timeZone));
  }, [initialFrom, initialTo, timeZone]);
  const custom = range === "custom";
  const startIso = adminZonedDateTimeIso(from, timeZone);
  const endIso = adminZonedDateTimeIso(to, timeZone);
  const current = Date.parse(now);
  const valid = Boolean(startIso && endIso
    && Date.parse(startIso) < Date.parse(endIso)
    && Date.parse(endIso) <= current
    && Date.parse(endIso) - Date.parse(startIso) <= 90 * 86400000);
  return (
    <>
      <div data-testid="journey-date-range" className="min-w-0"><SearchMonitorSelect label="Date range" name="range" value={range} appearance="fare" align="end" truncateLabel
        onValueChange={value => {
          const next = value as JourneyDateRange;
          if (next === "custom" && range !== "custom") {
            const end = localNow;
            setTo(end);
            setFrom(adminOffsetZonedDateTime(end, -7 * 24 * 60, timeZone));
          }
          setRange(next);
        }}
        options={[
          ...ADMIN_REPORTING_RANGE_OPTIONS,
          ...(range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : []),
          ...(range === "90d" ? [{ value: "90d", label: "Last 90 days (legacy)" }] : []),
        ]} /></div>
      {custom ? (
        <div data-testid="journey-custom-date-fields" className="order-last col-span-full flex min-w-0 flex-wrap items-end gap-3">
          <label className="text-xs text-[#475569]">From (local)
            <AdminCalendarInput timeZone="local" mode="datetime-local" required value={from}
              max={to ? adminOffsetZonedDateTime(to, -1, timeZone) : localNow}
              min={to ? adminOffsetZonedDateTime(to, -90 * 24 * 60, timeZone) : undefined}
              onChange={e => setFrom(e.target.value)}
              className="ml-2 w-[220px] max-w-full" />
          </label>
          <label className="text-xs text-[#475569]">To (local)
            <AdminCalendarInput timeZone="local" mode="datetime-local" required value={to}
              min={from ? adminOffsetZonedDateTime(from, 1, timeZone) : undefined}
              max={from ? (adminOffsetZonedDateTime(from, 90 * 24 * 60, timeZone) < localNow ? adminOffsetZonedDateTime(from, 90 * 24 * 60, timeZone) : localNow) : localNow} onChange={e => setTo(e.target.value)}
              className="ml-2 w-[220px] max-w-full" />
          </label>
          <input name="from" type="hidden" value={startIso} />
          <input name="to" type="hidden" value={endIso} />
          {!valid ? <span role="alert" className="text-xs text-rose-600">Choose valid past local dates, up to 90 days apart, with From before To.</span> : null}
        </div>
      ) : null}
    </>
  );
}
