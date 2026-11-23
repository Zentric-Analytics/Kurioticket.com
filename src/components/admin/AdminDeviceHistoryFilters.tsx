"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminTimeZone } from "./AdminTimeZoneProvider";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { deviceHistoryHref, type DeviceHistoryQuery, type DeviceHistoryRange } from "@/lib/adminDeviceHistory";

const choices = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Custom dates" },
];
const field = "min-w-0 space-y-1 text-[12px] font-medium text-[#475569]";

export function AdminDeviceHistoryFilters({ path, query, returnHref }: {
  path: string; query: DeviceHistoryQuery; returnHref: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DeviceHistoryRange>(query.range);
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");
  const [pending, startTransition] = useTransition();
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(new Date(value + "T00:00:00Z").getTime())
    && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  const valid = range !== "custom" || (validDate(from) && validDate(to) && from <= to);
  const apply = () => {
    if (!valid || pending) return;
    const next: DeviceHistoryQuery = {
      range, page: 1, ...(range === "custom" ? { from, to } : {}),
    };
    startTransition(() => router.push(deviceHistoryHref(path, next, {}, returnHref), { scroll: false }));
  };
  return <section aria-label="Device history filters" className="min-w-0 space-y-3 border-y border-[#E2E8F0] py-3">
    <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,220px)_auto]">
      <SearchMonitorSelect label="Device history range" name="range" value={range}
        options={choices} appearance="fare" onValueChange={next => setRange(next as DeviceHistoryRange)} />
      <button type="button" disabled={!valid || pending} onClick={apply}
        className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60 sm:w-auto">
        {pending ? "Applying…" : "Apply filters"}
      </button>
    </div>
    {range === "custom" ? <div className="flex min-w-0 flex-wrap items-end gap-3">
      <label className={field}><span>From (local)</span>
        <AdminCalendarInput timeZone="local" ariaLabel="Device history From local" value={from} max={to || undefined}
          onValueChange={setFrom} className="w-[185px] max-w-full"/>
      </label>
      <label className={field}><span>To (local)</span>
        <AdminCalendarInput timeZone="local" ariaLabel="Device history To local" value={to} min={from || undefined}
          onValueChange={setTo} className="w-[185px] max-w-full"/>
      </label>
    </div> : null}
  </section>;
}
