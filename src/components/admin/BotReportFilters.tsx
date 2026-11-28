"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { BOT_DECISIONS, BOT_KINDS, botHref, type botFilters } from "@/lib/adminBotReport";
import { ADMIN_REPORTING_RANGE_OPTIONS, adminCustomDateRange } from "@/lib/adminReportingRanges";

export function BotReportFilters({ filters, now, history = false, details }: {
  filters: Pick<ReturnType<typeof botFilters>, "range" | "from" | "to" | "query" | "kind" | "decision">;
  now: string;
  history?: boolean;
  details?: { summary: ReactNode; history: ReactNode; sectionClassName: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState(filters.query);
  const [previousQuery, setPreviousQuery] = useState(filters.query);
  if (previousQuery !== filters.query) {
    setPreviousQuery(filters.query);
    if (query.trim() === previousQuery) setQuery(filters.query);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ base: string; target: string } | null>(null);
  const scope = JSON.stringify([filters.range, filters.from, filters.to]);
  const [previousScope, setPreviousScope] = useState(scope);
  const [range, setRange] = useState<string>(filters.range);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setRange(filters.range);
    setFrom(filters.from);
    setTo(filters.to);
  }

  useEffect(() => {
    function restore() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = null;
      const restored = new URLSearchParams(window.location.search).get("q")?.trim().slice(0, 100) ?? "";
      setQuery(restored);
    }
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function navigate(changes: Record<string, string>) {
    const current = window.location.search.slice(1);
    const base = pending.current?.base === current ? pending.current.target : current;
    const params = new URLSearchParams(base);
    if (changes.q !== undefined && changes.q === (params.get("q")?.trim() ?? "")) return;
    const target = botHref(pathname, params, { ...changes, page: "" });
    const search = target.split("?")[1] ?? "";
    if (search === base) return;
    pending.current = { base: current, target: search };
    router.push(target, { scroll: false });
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      navigate({ q: value.trim() });
    }, 350);
  }

  function changeDates(start: string, end: string) {
    setFrom(start);
    setTo(end);
    if (adminCustomDateRange(start, end, new Date(now), "UTC")) {
      navigate({ range: "custom", from: start, to: end });
    }
  }

  const invalid = range === "custom" && !adminCustomDateRange(from, to, new Date(now), "UTC");
  const rangeControl = <SearchMonitorSelect label={history ? "Time range" : "Date range"} name="range" value={range} options={ADMIN_REPORTING_RANGE_OPTIONS}
        timeZoneLabel="UTC" appearance="fare" align={history && !details ? "start" : "end"} truncateLabel
        onValueChange={value => {
          setRange(value);
          if (value === "custom") {
            changeDates(from, to);
          } else {
            setFrom("");
            setTo("");
            navigate({ range: value, from: "", to: "" });
          }
        }} />;
  const historyControls = <>
        <SearchMonitorSelect label="Activity type" name="kind" value={filters.kind ?? ""}
          options={[{ value: "", label: "All activity types" }, ...BOT_KINDS.filter(item => item.value !== "HISTORICAL_SEARCH")]} appearance="boxed"
          onValueChange={kind => navigate({ kind })} />
        <SearchMonitorSelect label="Decision" name="decision" value={filters.decision ?? ""}
          options={[{ value: "", label: "All decisions" }, ...BOT_DECISIONS]} appearance="boxed"
          onValueChange={decision => navigate({ decision })} />
      </>;
  const customDates = range === "custom" && (
        <div className="col-span-full flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-slate-600">From
            <AdminCalendarInput value={from} onValueChange={value => changeDates(value, to)} timeZone="UTC"
              max={now.slice(0, 10)} ariaLabel="From date" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-600">To
            <AdminCalendarInput value={to} onValueChange={value => changeDates(from, value)} timeZone="UTC"
              max={now.slice(0, 10)} ariaLabel="To date" />
          </label>
          {invalid && <p className="text-xs text-slate-600" role="status">Choose both dates within a 90-day range, with no future dates.</p>}
        </div>
      );

  // A single controller owns all detail-page navigation. The date range is
  // shared by the summary and history, while type/decision only filter history.
  if (details) return <>
    <section className={details.sectionClassName}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Activity Summary</h2>
        <div className="w-full min-w-0 sm:w-52">{rangeControl}</div>
      </div>
      {customDates}
      {!invalid && details.summary}
    </section>
    <section className={details.sectionClassName}>
      <h2 className="text-base font-semibold text-slate-950">Activity History</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{historyControls}</div>
      {!invalid && details.history}
    </section>
  </>;

  return (
    <div
      className={history ? "grid grid-cols-1 gap-3 sm:grid-cols-3" : "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-center gap-2 sm:gap-3"}>
      {!history && (
        <div className="relative min-w-0">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="search" maxLength={100} value={query} onChange={event => changeQuery(event.target.value)}
            aria-label="Search bot name or ID" placeholder="Search bot name or ID"
            className="h-11 w-full rounded-lg border border-[#D8E1EC] bg-white py-2 pl-9 pr-2 text-[13px] text-slate-950 focus-visible:outline-2 focus-visible:outline-[#004BB8]" />
        </div>
      )}
      {rangeControl}
      {history && historyControls}
      {customDates}
    </div>
  );
}
