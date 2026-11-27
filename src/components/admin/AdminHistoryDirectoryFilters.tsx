"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { PAGE_HISTORY_PLATFORMS, type PageHistoryPlatform } from "@/lib/adminPageHistory";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import type { DeviceHistoryRange } from "@/lib/adminDeviceHistory";
import { historyDirectoryHref, parseHistoryDirectoryQuery, type HistoryDirectoryQuery, type HistorySection } from "@/lib/adminHistoryDirectory";

export function AdminHistoryDirectoryFilters({ section, query, timeZone }: { section: HistorySection; query: HistoryDirectoryQuery; timeZone: string }) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const [range, setRange] = useState(query.range);
  const [platform, setPlatform] = useState(query.platform);
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");
  const [pending, startTransition] = useTransition();
  const parsed = parseHistoryDirectoryQuery(section, { range, q, tab: query.tab, platform, page: "1", from, to });
  const apply = () => {
    if (!parsed.ok || pending) return;
    startTransition(() => router.push(historyDirectoryHref(section, parsed.query), { scroll: false }));
  };
  return <section aria-label="History directory filters" data-users-navigation-pending={pending ? "true" : undefined} className="min-w-0 space-y-3">
    <div data-testid="history-directory-filter-row" className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(108px,0.75fr)]">
      <label className="relative min-w-0">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-[#64748B]"/>
        <input aria-label="Search name, email or ID" placeholder="Search name, email or ID" value={q} maxLength={80}
          onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          className="focus-ring h-10 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px]"/>
      </label>
      <SearchMonitorSelect label="History range" name="range" timeZoneLabel={formatAdminTimeZoneLabel(timeZone)} value={range} options={ADMIN_REPORTING_RANGE_OPTIONS} appearance="fare" truncateLabel onValueChange={value => setRange(value as DeviceHistoryRange)}/>
      <SearchMonitorSelect label="History platform" name="platform" value={platform} options={PAGE_HISTORY_PLATFORMS} appearance="fare" truncateLabel onValueChange={value => setPlatform(value as PageHistoryPlatform)}/>
      <button type="button" disabled={!parsed.ok || pending} onClick={apply} className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">{pending ? "Applying…" : "Apply filters"}</button>
    </div>
    {range === "custom" ? <div className="grid min-w-0 grid-cols-1 items-end gap-2 text-[12px] text-[#475569] sm:grid-cols-2 lg:max-w-[440px]">
      <label className="min-w-0 space-y-1"><span>From</span><AdminCalendarInput timeZone={timeZone} ariaLabel="History start date" value={from} max={to || undefined} onValueChange={setFrom} className="w-[185px] max-w-full"/></label>
      <label className="min-w-0 space-y-1"><span>To</span><AdminCalendarInput timeZone={timeZone} ariaLabel="History end date" value={to} min={from || undefined} onValueChange={setTo} className="w-[185px] max-w-full"/></label>
    </div> : null}
  </section>;
}
