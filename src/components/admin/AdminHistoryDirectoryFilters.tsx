"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { PAGE_HISTORY_PLATFORMS, type PageHistoryPlatform } from "@/lib/adminPageHistory";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import type { DeviceHistoryRange } from "@/lib/adminDeviceHistory";
import { historyDirectoryHref, parseHistoryDirectoryQuery, type HistoryDirectoryQuery, type HistorySection } from "@/lib/adminHistoryDirectory";

export function AdminHistoryDirectoryFilters({ section, query }: { section: HistorySection; query: HistoryDirectoryQuery }) {
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
  return <section aria-label="History directory filters" className="min-w-0 space-y-3">
    <div className={"grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 " + (section === "pages" ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]")}>
      <label className="relative min-w-0">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-[#64748B]"/>
        <input aria-label="Search name, email or ID" placeholder={section === "devices" ? "Search name, email or user ID" : "Search name, email or visitor ID"} value={q} maxLength={80}
          onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          className="focus-ring h-10 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px]"/>
      </label>
      <SearchMonitorSelect label="History range" name="range" value={range} options={ADMIN_REPORTING_RANGE_OPTIONS} appearance="fare" onValueChange={value => setRange(value as DeviceHistoryRange)}/>
      {section === "pages" ? <SearchMonitorSelect label="History platform" name="platform" value={platform} options={PAGE_HISTORY_PLATFORMS} appearance="fare" onValueChange={value => setPlatform(value as PageHistoryPlatform)}/> : null}
      <button type="button" disabled={!parsed.ok || pending} onClick={apply} className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">{pending ? "Applying…" : "Apply filters"}</button>
    </div>
    {range === "custom" ? <div className="flex min-w-0 flex-wrap items-end gap-3 text-[12px] text-[#475569]">
      <label className="min-w-0 space-y-1"><span>From (UTC)</span><AdminCalendarInput ariaLabel="History start date UTC" value={from} max={to || undefined} onValueChange={setFrom} className="w-[185px] max-w-full"/></label>
      <label className="min-w-0 space-y-1"><span>To (UTC)</span><AdminCalendarInput ariaLabel="History end date UTC" value={to} min={from || undefined} onValueChange={setTo} className="w-[185px] max-w-full"/></label>
    </div> : null}
  </section>;
}
