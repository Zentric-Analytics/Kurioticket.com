"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { adminCalendarRange, formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { displayActivityCalendarDate } from "@/lib/adminActivityDateQuery";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Values = { tab: string; q: string; product: string; stage: string; order: string; from: string; to: string; range: string };
const options = {
  product: [["all","All products"],["FLIGHT","Flights"],["HOTEL","Hotels"],["CAR","Cars"],["PACKAGE","Packages"]],
  stage: [["all","All activity types"],["SEARCH_COMPLETED","Search completed"],["RESULTS_VIEWED","Results viewed"],["FLIGHT_DETAILS_VIEWED","Flight details viewed"],["OFFER_SELECTED","Offer selected"],["PROVIDER_DEAL_SELECTED","Provider deal selected"],["PROVIDER_HANDOFF_STARTED","Provider handoff"],["RESULT_SAVED","Result saved"],["RESULT_UNSAVED","Result unsaved"],["RESULT_SHARED","Result shared"],["PRICE_ALERT_CREATED","Price alert created"],["ACCOUNT_ACTIVITY","Account activity"]],
  order: [["newest","Newest first"],["oldest","Oldest first"]],
};
export function ActivityFiltersBar({ path, initial, directory, tabs, timeZone, now }: {
  path: string; initial: Values; directory: string; tabs: ReactNode; timeZone: string; now: string;
}) {
  const initialDates = {
    from: displayActivityCalendarDate(initial.from, timeZone),
    to: displayActivityCalendarDate(initial.to, timeZone, true),
  };
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [draftDates, setDraftDates] = useState(initialDates);
  const [editingCustom, setEditingCustom] = useState(false);
  const [pending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");
  const scope = JSON.stringify([initial.tab, initial.q, initial.product, initial.stage, initial.order, initial.from, initial.to, initial.range, timeZone]);
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setValues(initial);
    setDraftDates(initialDates);
    setEditingCustom(false);
  }
  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    submitted.current = "";
  }, [scope]);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const navigate = (next: Values) => {
    const params = new URLSearchParams();
    if (directory) params.set("directory", directory);
    if (next.tab !== "all") params.set("tab", next.tab);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.product !== "all") params.set("product", next.product);
    if (next.stage !== "all") { params.set("stage", next.stage); params.set("type", next.stage); }
    if (next.order !== "newest") { params.set("order", next.order); params.set("sort", next.order); }
    params.set("range", next.range);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const url = path + (params.size ? "?" + params.toString() : "");
    if (submitted.current === url) return;
    submitted.current = url;
    startTransition(() => router.replace(url, { scroll: false }));
  };
  const update = (patch: Partial<Values>) => {
    // Update draft state only. An explicit Apply filters click navigates.
    setValues(current => ({ ...current, ...patch }));
  };
  const rangeOptions = [...ADMIN_REPORTING_RANGE_OPTIONS,
    ...(values.range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : [])];
  const setRange = (range: string) => {
    if (range === "custom") {
      setDraftDates(values.range === "custom" ? initialDates : { from: "", to: "" });
      setEditingCustom(true);
      return;
    }
    setEditingCustom(false);
    update({ range, from: "", to: "" });
  };
  const accessOrPages = values.tab === "access" || values.tab === "pages";
  const validCustom = Boolean(adminCalendarRange(draftDates.from, draftDates.to, timeZone));
  const customDates = initial.range === "custom" && draftDates.from === initialDates.from && draftDates.to === initialDates.to
    ? { from: initial.from, to: initial.to }
    : draftDates;
  const cancelDates = () => {
    setEditingCustom(false);
    setValues(current => ({...current, range: initial.range, from: initial.from, to: initial.to}));
    setDraftDates(initialDates);
  };
  return <div className="min-w-0 space-y-3">
    <label className="relative block min-w-0">
      <span className="sr-only">Search activity</span>
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#64748B]" />
      <input aria-label="Search activity" value={values.q} maxLength={80} placeholder={values.tab === "access" ? "Platform or access type" : values.tab === "pages" ? "Page or screen" : "Route, destination, or provider"}
        onChange={e => update({q:e.target.value})}
        onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
        className="h-11 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
    </label>
    <div className="min-w-0 border-b border-[#E2E8F0] pb-2">
      <div data-testid="activity-filters-row" className={"grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 " + (accessOrPages ? "lg:grid-cols-[minmax(0,1fr)_120px]" : "lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(120px,0.7fr)]")}>
        <SearchMonitorSelect label="Date range" name="range" value={editingCustom ? "custom" : values.range} options={rangeOptions}
          appearance="fare" timeZoneLabel={formatAdminTimeZoneLabel(timeZone, new Date(now))} onValueChange={setRange} />
        {!accessOrPages ? <><SearchMonitorSelect label="Activity product" name="product" value={values.product}
          options={options.product.map(([value,label])=>({value,label}))} appearance="fare"
          onValueChange={product=>update({product})} />
        <SearchMonitorSelect label="Activity type" name="stage" value={values.stage}
          options={options.stage.map(([value,label])=>({value,label}))} appearance="fare"
          onValueChange={stage=>update({stage})} /></> : null}
        <button type="button" onClick={() => navigate((editingCustom || values.range === "custom") && validCustom
          ? { ...values, range: "custom", ...customDates } : values)}
          disabled={pending || ((editingCustom || values.range === "custom") && !validCustom)}
          className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">
          Apply filters
        </button>
      </div>
      {(editingCustom || values.range === "custom") ? <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-xs text-[#64748B]">From
        <AdminCalendarInput timeZone={timeZone} ariaLabel="Custom start date" value={draftDates.from}
          max={draftDates.to || undefined} onChange={e => { setDraftDates(current => ({...current, from:e.target.value}));
          setValues(current => ({...current, range:"custom", from:e.target.value})); }} className="w-[210px] max-w-full" />
      </label>
      <label className="text-xs text-[#64748B]">To
        <AdminCalendarInput timeZone={timeZone} ariaLabel="Custom end date" value={draftDates.to}
          min={draftDates.from || undefined} onChange={e => { setDraftDates(current => ({...current, to:e.target.value}));
          setValues(current => ({...current, range:"custom", to:e.target.value})); }} className="w-[210px] max-w-full" />
      </label>
      <button type="button" onClick={cancelDates} className="h-11 px-2 text-[13px] font-medium text-[#475569] hover:underline">Cancel</button>
      </div> : null}
      <div data-testid="activity-tabs-after-filters" className="mt-3 min-w-0 border-t border-[#E2E8F0] pt-1">{tabs}</div>
    </div>
    <span aria-live="polite" className="sr-only">{pending ? "Loading activity…" : ""}</span>
  </div>;
}
