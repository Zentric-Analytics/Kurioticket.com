"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { ADMIN_REPORTING_RANGE_OPTIONS, adminRollingRange, type AdminReportingRange } from "@/lib/adminReportingRanges";
import { PAGE_HISTORY_PLATFORMS, pageHistoryHref, type PageHistoryPlatform, type PageHistoryQuery } from "@/lib/adminPageHistory";
import { parseActivityFilters, type ActivityProduct } from "@/lib/adminIdentityActivity";

const products = [{ value: "all", label: "All products" }, { value: "FLIGHT", label: "Flights" }, { value: "HOTEL", label: "Hotels" }, { value: "CAR", label: "Cars" }, { value: "PACKAGE", label: "Packages" }];
function day(value: string, end = false) {
  if (!value || value.length === 10) return value;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? new Date(at - (end ? 1 : 0)).toISOString().slice(0, 10) : "";
}
export function AdminPageHistoryFilters({ path, query, returnHref }: { path: string; query: PageHistoryQuery; returnHref: string }) {
  const router = useRouter();
  const [range, setRange] = useState(query.range);
  const [platform, setPlatform] = useState(query.platform);
  const [product, setProduct] = useState(query.filters.product);
  const [q, setQ] = useState(query.filters.q);
  const [from, setFrom] = useState(day(query.filters.from));
  const [to, setTo] = useState(day(query.filters.to, true));
  const [pending, startTransition] = useTransition();
  const customDates = range === "custom";
  const customValid = !customDates || (Boolean(from && to) && parseActivityFilters({ from, to }).ok);
  const rangeOptions = [...ADMIN_REPORTING_RANGE_OPTIONS, ...(range === "24h" ? [{ value: "24h", label: "Last 24 hrs" } as const] : [])];
  const apply = () => {
    if (pending || !customValid) return;
    const now = new Date();
    const dates = range === "all" ? { from: "", to: now.toISOString() }
      : range === "custom" ? (query.range === "custom" && from === day(query.filters.from) && to === day(query.filters.to, true)
        ? { from: query.filters.from, to: query.filters.to } : { from, to })
      : adminRollingRange(range, now);
    const filters = { ...query.filters, ...dates, q: q.trim(), product };
    const parsed = parseActivityFilters({ ...filters });
    if (!parsed.ok) return;
    const href = pageHistoryHref(path, { filters: parsed.filters, range, platform, page: 1 }, returnHref);
    startTransition(() => router.push(href, { scroll: false }));
  };
  return <section aria-label="Page history filters" className="min-w-0 space-y-3 border-y border-[#E2E8F0] py-3">
    <div data-testid="page-history-filter-row" className="grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_minmax(104px,0.8fr)]">
      <label className="relative min-w-0">
        <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3 text-[#64748B]"/>
        <input aria-label="Search page or route" placeholder="Search page or route" maxLength={80} value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          className="focus-ring h-10 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px]"/>
      </label>
      <SearchMonitorSelect label="Page history range" name="range" value={range} options={rangeOptions} appearance="fare" truncateLabel onValueChange={value => setRange(value as AdminReportingRange)}/>
      <SearchMonitorSelect label="Page history platform" name="platform" value={platform} options={[...PAGE_HISTORY_PLATFORMS]} appearance="fare" truncateLabel onValueChange={value => setPlatform(value as PageHistoryPlatform)}/>
      <SearchMonitorSelect label="Page history product" name="product" value={product} options={products} appearance="fare" truncateLabel onValueChange={value => setProduct(value as ActivityProduct)}/>
      <button type="button" disabled={pending || !customValid} onClick={apply}
        className="focus-ring inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
        {pending ? "Applying…" : "Apply filters"}
      </button>
    </div>
    {customDates ? <div className="grid min-w-0 grid-cols-1 items-end gap-2 text-[12px] text-[#475569] sm:grid-cols-2 lg:max-w-[440px]">
      <label className="min-w-0 space-y-1"><span>From (UTC)</span><AdminCalendarInput ariaLabel="Page history From UTC" value={from} max={to || undefined} onValueChange={setFrom} className="w-[185px] max-w-full"/></label>
      <label className="min-w-0 space-y-1"><span>To (UTC)</span><AdminCalendarInput ariaLabel="Page history To UTC" value={to} min={from || undefined} onValueChange={setTo} className="w-[185px] max-w-full"/></label>
    </div> : null}
  </section>;
}
