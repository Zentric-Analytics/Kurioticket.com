"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { deviceHistoryHref, type DeviceHistoryQuery, type DeviceHistoryRange } from "@/lib/adminDeviceHistory";
import { PAGE_HISTORY_PLATFORMS, type PageHistoryPlatform } from "@/lib/adminPageHistory";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";

const choices = ADMIN_REPORTING_RANGE_OPTIONS;
const field = "min-w-0 space-y-1 text-[12px] font-medium text-[#475569]";

export function AdminDeviceHistoryFilters({ path, query, returnHref, timeZone }: {
  path: string; query: DeviceHistoryQuery; returnHref: string; timeZone: string;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DeviceHistoryRange>(query.range);
  const [platform, setPlatform] = useState<PageHistoryPlatform>(query.platform ?? "all");
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
      range, platform, page: 1, ...(range === "custom" ? { from, to } : {}),
    };
    startTransition(() => router.push(deviceHistoryHref(path, next, {}, returnHref), { scroll: false }));
  };
  return <section aria-label="Device history filters" data-users-navigation-pending={pending ? "true" : undefined} className="min-w-0 space-y-3 border-y border-[#E2E8F0] py-3">
    <div data-testid="device-history-filter-row" className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))_minmax(108px,0.75fr)]">
      <SearchMonitorSelect label="Device history range" name="range" timeZoneLabel={formatAdminTimeZoneLabel(timeZone)} value={range}
        options={choices} appearance="fare" truncateLabel onValueChange={next => setRange(next as DeviceHistoryRange)} />
      <SearchMonitorSelect label="Device history platform" name="platform" value={platform} options={PAGE_HISTORY_PLATFORMS} appearance="fare" truncateLabel onValueChange={next => setPlatform(next as PageHistoryPlatform)}/>
      <button type="button" disabled={!valid || pending} onClick={apply}
        className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
        {pending ? "Applying…" : "Apply filters"}
      </button>
    </div>
    {range === "custom" ? <div className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:max-w-[440px]">
      <label className={field}><span>From</span>
        <AdminCalendarInput timeZone={timeZone} ariaLabel="Device history From" value={from} max={to || undefined}
          onValueChange={setFrom} className="w-[185px] max-w-full"/>
      </label>
      <label className={field}><span>To</span>
        <AdminCalendarInput timeZone={timeZone} ariaLabel="Device history To" value={to} min={from || undefined}
          onValueChange={setTo} className="w-[185px] max-w-full"/>
      </label>
    </div> : null}
  </section>;
}
