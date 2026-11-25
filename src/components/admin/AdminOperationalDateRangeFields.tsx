"use client";

import { useEffect, useRef, useState } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { ADMIN_REPORTING_RANGE_OPTIONS, type AdminReportingRange } from "@/lib/adminReportingRanges";
import { adminCalendarRange, adminLocalDate, adminLocalDateTime, adminLocalDateTimeToDate, formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";

const MAX_RANGE_MS = 90 * 86_400_000;

function clockInput(value: string, timeZone: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? adminLocalDateTime(date, timeZone) : "";
}

function clockQueryValue(value: string, initial: string, timeZone: string) {
  return value === clockInput(initial, timeZone) ? initial : value;
}

function clockTimestamp(value: string, timeZone: string) {
  const local = adminLocalDateTimeToDate(value, timeZone);
  return local ? local.getTime() : /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}

/** Display local calendar dates while preserving explicit timestamp bookmarks. */
export function AdminOperationalDateRangeFields({
  initialRange,
  initialFrom,
  initialTo,
  now,
  timeZone,
  testId,
  customTestId = testId + "-custom",
  align = "start",
  legacyOptions = [],
}: {
  initialRange: AdminReportingRange | "90d";
  initialFrom: string;
  initialTo: string;
  now: string;
  timeZone: string;
  testId: string;
  customTestId?: string;
  align?: "start" | "end";
  legacyOptions?: readonly { value: string; label: string }[];
}) {
  const initialClock = initialRange !== "custom" || ![initialFrom, initialTo].some(value => /^\d{4}-\d{2}-\d{2}$/.test(value));
  const initialDates = {
    from: initialClock ? clockInput(initialFrom, timeZone) : initialFrom,
    to: initialClock ? clockInput(initialTo, timeZone) : initialTo,
  };
  const scope = JSON.stringify([initialRange, initialFrom, initialTo, timeZone]);
  const [previousScope, setPreviousScope] = useState(scope);
  const [range, setRange] = useState<string>(initialRange);
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [clock, setClock] = useState(initialClock);
  const controls = useRef<HTMLDivElement>(null);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setRange(initialRange);
    setFrom(initialDates.from);
    setTo(initialDates.to);
    setClock(initialClock);
  }

  const reference = new Date(now);
  const today = adminLocalDate(reference, timeZone);
  const zoneLabel = formatAdminTimeZoneLabel(timeZone, reference);
  const latest = clock ? adminLocalDateTime(reference, timeZone) : today;
  const start = clock ? clockQueryValue(from, initialFrom, timeZone) : from;
  const end = clock ? clockQueryValue(to, initialTo, timeZone) : to;
  const dates = clock ? null : adminCalendarRange(from, to, timeZone);
  const startMs = dates ? dates.from.getTime() : clockTimestamp(start, timeZone);
  const endMs = dates ? Math.min(dates.to.getTime(), reference.getTime()) : clockTimestamp(end, timeZone);
  const unchangedOpenBound = initialRange === "custom" && Boolean(from) !== Boolean(to)
    && from === initialDates.from && to === initialDates.to
    && Number.isFinite(clock ? (from ? startMs : endMs) : Date.parse(from || to));
  const valid = unchangedOpenBound || Boolean((clock || dates) && startMs < endMs
    && endMs <= reference.getTime() && endMs - startMs <= MAX_RANGE_MS);
  useEffect(() => {
    const form = controls.current?.closest("form");
    if (!form || range !== "custom" || valid) return;
    const blockInvalidRange = (event: SubmitEvent) => event.preventDefault();
    form.addEventListener("submit", blockInvalidRange);
    return () => form.removeEventListener("submit", blockInvalidRange);
  }, [range, valid]);

  return <>
    <div ref={controls} data-testid={testId} className="min-w-0">
      <SearchMonitorSelect label="Date range" name="range" value={range}
        timeZoneLabel={zoneLabel} options={[...ADMIN_REPORTING_RANGE_OPTIONS, ...legacyOptions]}
        appearance="fare" align={align} onValueChange={value => {
          setRange(value);
          if (value === "custom" && range !== "custom" && (!from || !to)) {
            setClock(true);
            setTo(adminLocalDateTime(reference, timeZone));
            setFrom(adminLocalDateTime(new Date(reference.getTime() - 7 * 86_400_000), timeZone));
          }
        }} truncateLabel />
    </div>
    {range === "custom" ? (
      <div data-testid={customTestId} className="order-last col-span-full flex min-w-0 flex-wrap items-end gap-3 border-t border-[#E7ECF5] py-3">
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">From
          <AdminCalendarInput mode={clock ? "datetime-local" : "date"} timeZone={timeZone} required value={from}
            onChange={event => setFrom(event.target.value)} max={to || latest} className="w-[220px] max-w-full" />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[#475569]">To
          <AdminCalendarInput mode={clock ? "datetime-local" : "date"} timeZone={timeZone} required value={to}
            onChange={event => setTo(event.target.value)} min={from || undefined} max={latest} className="w-[220px] max-w-full" />
        </label>
        <input type="hidden" name="from" value={start} />
        <input type="hidden" name="to" value={end} />
        {!valid ? <span role="alert" className="text-[12px] text-rose-700">
          Choose a valid date range within 90 days, with no future dates.
        </span> : null}
      </div>
    ) : null}
  </>;
}
