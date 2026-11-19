"use client";

import { useState } from "react";
import { AdminDirectorySelect } from "./AdminDirectorySelect";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import type { SettingsHistoryRange } from "@/services/adminSettingsHistoryCore";

/** Custom dates appear after the primary three-column toolbar and are applied
 * only with the existing Settings History GET form. */
export function SettingsHistoryRangeControl({
  range, fromDate, toDate, today,
}: { range: SettingsHistoryRange; fromDate: string; toDate: string; today: string }) {
  const [selected, setSelected] = useState<SettingsHistoryRange>(range);
  const [from, setFrom] = useState(fromDate || "");
  const [to, setTo] = useState(toDate || "");
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to && to <= today &&
    Date.parse(to) - Date.parse(from) < 90 * 86400000;
  return <>
    <div className="min-w-0" data-testid="settings-history-range-control">
      <AdminDirectorySelect label="Date range" name="range" value={selected}
        options={[...ADMIN_REPORTING_RANGE_OPTIONS,
          ...(selected === "90d" ? [{ value: "90d", label: "Last 90 days (legacy)" }] : [])]}
        compact attached onValueChange={value => {
          setSelected(value as SettingsHistoryRange);
          if (value === "custom" && (!from || !to)) {
            setTo(today);
            setFrom(new Date(Date.parse(today) - 7 * 86400000).toISOString().slice(0, 10));
          }
        }} />
    </div>
    {selected === "custom" ? <div className="order-last col-span-full flex min-w-0 flex-wrap items-end gap-3" data-testid="settings-history-custom-range">
      <label className="flex flex-col gap-1 text-[12px] text-[#475569]">From (UTC)
        <input type="date" name="fromDate" required value={from} max={to || today}
          onChange={event => setFrom(event.target.value)}
          className="h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px]" />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-[#475569]">To (UTC)
        <input type="date" name="toDate" required value={to} min={from || undefined} max={today}
          onChange={event => setTo(event.target.value)}
          className="h-10 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px]" />
      </label>
      {!valid ? <p role="alert" className="text-[12px] text-rose-700">Choose valid past UTC dates no more than 90 days apart.</p> : null}
    </div> : null}
  </>;
}
