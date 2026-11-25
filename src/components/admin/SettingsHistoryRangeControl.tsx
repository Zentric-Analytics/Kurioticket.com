"use client";

import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { useState } from "react";
import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { shiftAdminCalendarDate } from "@/lib/adminLocalTime";
import { ADMIN_REPORTING_RANGE_OPTIONS, validAdminCustomCalendarDates } from "@/lib/adminReportingRanges";
import type { SettingsHistoryRange } from "@/services/adminSettingsHistoryCore";

/** Custom dates appear after the primary three-column toolbar and are applied
 * only with the existing Settings History GET form. */
export function SettingsHistoryRangeControl({
  range, fromDate, toDate, today, timeZone, timeZoneLabel,
}: { range: SettingsHistoryRange; fromDate: string; toDate: string; today: string; timeZone: string; timeZoneLabel: string }) {
  const [selected, setSelected] = useState<SettingsHistoryRange>(range);
  const [from, setFrom] = useState(fromDate || "");
  const [to, setTo] = useState(toDate || "");
  const valid = validAdminCustomCalendarDates(from, to, today);
  return <>
    <div className="min-w-0" data-testid="settings-history-range-control">
      <AdminDirectorySelect label="Date range" name="range" value={selected} timeZoneLabel={timeZoneLabel}
        options={[...ADMIN_REPORTING_RANGE_OPTIONS,
          ...(selected === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : []),
          ...(selected === "90d" ? [{ value: "90d", label: "Last 90 days (legacy)" }] : [])]}
        compact attached onValueChange={value => {
          setSelected(value as SettingsHistoryRange);
          if (value === "custom" && (!from || !to)) {
            setTo(today);
            setFrom(shiftAdminCalendarDate(today, -7) ?? today);
          }
        }} />
    </div>
    {selected === "custom" ? <div className="order-last col-span-full flex min-w-0 flex-wrap items-end gap-3" data-testid="settings-history-custom-range">
      <label className="flex flex-col gap-1 text-[12px] text-[#475569]">From ({timeZoneLabel})
        <AdminCalendarInput name="fromDate" required value={from} max={to || today} timeZone={timeZone}
          ariaLabel={"Settings history start date (" + timeZoneLabel + ")"}
          onChange={event => setFrom(event.target.value)}
          className="w-[210px] max-w-full" />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-[#475569]">To ({timeZoneLabel})
        <AdminCalendarInput name="toDate" required value={to} min={from || undefined} max={today} timeZone={timeZone}
          ariaLabel={"Settings history end date (" + timeZoneLabel + ")"}
          onChange={event => setTo(event.target.value)}
          className="w-[210px] max-w-full" />
      </label>
      {!valid ? <p role="alert" className="text-[12px] text-rose-700">Choose valid dates up to today for a range of at most 90 days.</p> : null}
    </div> : null}
  </>;
}
