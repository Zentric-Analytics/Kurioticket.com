"use client";

import { useEffect, useRef, useState } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { ADMIN_REPORTING_RANGE_OPTIONS, type AdminReportingRange } from "@/lib/adminReportingRanges";
import { adminOffsetZonedDateTime, adminZonedDateTimeInput, adminZonedDateTimeIso } from "@/lib/adminTimeZone";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";

/** Used only by operational record directories supporting ISO from/to.
 * Custom local bounds (submitted as UTC instants) appear on their own row, without disturbing the desktop
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
  const timeZone = useAdminTimeZone();
  const localNow = adminZonedDateTimeInput(now, timeZone);
  const [range, setRange] = useState<string>(initialRange);
  const [from, setFrom] = useState(adminZonedDateTimeInput(initialFrom, "UTC"));
  const [to, setTo] = useState(adminZonedDateTimeInput(initialTo, "UTC"));
  const lastScope = useRef(JSON.stringify([initialRange, initialFrom, initialTo]));
  useEffect(() => {
    const scope = JSON.stringify([initialRange, initialFrom, initialTo]);
    if (lastScope.current === scope) return;
    lastScope.current = scope;
    setRange(initialRange);
    setFrom(adminZonedDateTimeInput(initialFrom, timeZone));
    setTo(adminZonedDateTimeInput(initialTo, timeZone));
  }, [initialRange, initialFrom, initialTo, timeZone]);
  useEffect(() => {
    setFrom(adminZonedDateTimeInput(initialFrom, timeZone));
    setTo(adminZonedDateTimeInput(initialTo, timeZone));
  }, [timeZone, initialFrom, initialTo]);
  const custom = range === "custom";
  const start = adminZonedDateTimeIso(from, timeZone);
  const end = adminZonedDateTimeIso(to, timeZone);
  const endTime = Date.parse(end);
  const valid = Boolean(start && end && Date.parse(start) < endTime &&
    endTime <= Date.parse(now) && endTime - Date.parse(start) <= 90 * 86400000);
  return <>
    <div data-testid={testId} className="min-w-0">
      <SearchMonitorSelect label="Date range" name="range" value={range}
        options={[...ADMIN_REPORTING_RANGE_OPTIONS, ...legacyOptions]}
        appearance="fare" onValueChange={value => {
          setRange(value);
          if (value === "custom" && range !== "custom" && (!from || !to)) {
            setTo(localNow);
            setFrom(adminZonedDateTimeInput(new Date(Date.parse(now) - 7 * 86400000).toISOString(), timeZone));
          }
        }} truncateLabel />
    </div>
    {custom ? (
      <div data-testid={testId + "-custom"} className="col-span-full flex min-w-0 flex-wrap items-end gap-3 border-t border-[#E7ECF5] py-3">
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">From (local)
          <AdminCalendarInput timeZone="local" mode="datetime-local" required value={from} onChange={event => setFrom(event.target.value)}
            min={to ? adminOffsetZonedDateTime(to, -90 * 24 * 60, timeZone) : undefined}
            max={to ? adminOffsetZonedDateTime(to, -1, timeZone) : localNow}
            className="w-[220px] max-w-full" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">To (local)
          <AdminCalendarInput timeZone="local" mode="datetime-local" required value={to} onChange={event => setTo(event.target.value)}
            min={from ? adminOffsetZonedDateTime(from, 1, timeZone) : undefined}
            max={from ? (adminOffsetZonedDateTime(from, 90 * 24 * 60, timeZone) < localNow ? adminOffsetZonedDateTime(from, 90 * 24 * 60, timeZone) : localNow) : localNow}
            className="w-[220px] max-w-full" />
        </label>
        <input type="hidden" name="from" value={start} />
        <input type="hidden" name="to" value={end} />
        {!valid ? <span role="alert" className="text-[12px] text-rose-700">
          Choose valid local dates within 90 days, with From before To and no future date.
        </span> : null}
      </div>
    ) : null}
  </>;
}
