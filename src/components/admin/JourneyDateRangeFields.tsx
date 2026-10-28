"use client";

import { useEffect, useRef, useState } from "react";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { offsetUtcDateTime, utcDateTimeInput, utcDateTimeIso, type JourneyDateRange } from "@/lib/adminJourneyDateRange";

export function JourneyDateRangeFields({ initialRange, initialFrom, initialTo, now }: {
  initialRange: JourneyDateRange; initialFrom: string; initialTo: string; now: string;
}) {
  const [range, setRange] = useState<JourneyDateRange>(initialRange);
  const [from, setFrom] = useState(utcDateTimeInput(initialFrom));
  const [to, setTo] = useState(utcDateTimeInput(initialTo));
  const toInputRef = useRef<HTMLInputElement>(null);
  const custom = range === "custom";
  const startIso = utcDateTimeIso(from);
  const endIso = utcDateTimeIso(to);
  const current = Date.parse(now);
  const valid = Boolean(startIso && endIso
    && Date.parse(startIso) < Date.parse(endIso)
    && Date.parse(endIso) <= current
    && Date.parse(endIso) - Date.parse(startIso) <= 90 * 86400000);
  // Min/max date controls alone are inclusive and don't enforce strictly
  // increasing endpoints. Attach the rule to the native form validity API
  // so invalid custom bounds cannot be submitted to the journey reader.
  useEffect(() => {
    if (!custom) return;
    toInputRef.current?.setCustomValidity(valid ? "" : "Choose a valid UTC interval with From before To, no more than 90 days.");
  }, [custom, valid]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchMonitorSelect label="Date range" name="range" value={range}
        onValueChange={value => {
          const next = value as JourneyDateRange;
          if (next === "custom" && range !== "custom") {
            const end = now.slice(0, 16);
            setTo(end);
            setFrom(offsetUtcDateTime(end, -7 * 24 * 60));
          }
          setRange(next);
        }}
        appearance="plain"
        options={[
          { value: "today", label: "Today" },
          { value: "7d", label: "Last 7 days" },
          { value: "30d", label: "Last 30 days" },
          { value: "90d", label: "Last 90 days" },
          { value: "custom", label: "Custom dates" },
        ]} />
      {custom ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[#475569]">From (UTC)
            <input type="datetime-local" required value={from}
              max={to ? offsetUtcDateTime(to, -1) : now.slice(0, 16)}
              min={to ? offsetUtcDateTime(to, -90 * 24 * 60) : undefined}
              onChange={e => setFrom(e.target.value)}
              className="ml-2 h-9 border-b border-[#AEB8C6] bg-white text-xs text-[#374151]" />
          </label>
          <label className="text-xs text-[#475569]">To (UTC)
            <input ref={toInputRef} type="datetime-local" required value={to}
              min={from ? offsetUtcDateTime(from, 1) : undefined}
              max={from ? (offsetUtcDateTime(from, 90 * 24 * 60) < now.slice(0,16) ? offsetUtcDateTime(from, 90 * 24 * 60) : now.slice(0,16)) : now.slice(0,16)} onChange={e => setTo(e.target.value)}
              className="ml-2 h-9 border-b border-[#AEB8C6] bg-white text-xs text-[#374151]" />
          </label>
          <input name="from" type="hidden" value={startIso} />
          <input name="to" type="hidden" value={endIso} />
          {!valid ? <span role="alert" className="text-xs text-rose-600">Choose valid past UTC dates, up to 90 days apart, with From before To.</span> : null}
        </div>
      ) : null}
    </div>
  );
}
