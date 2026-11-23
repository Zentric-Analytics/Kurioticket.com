"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Values = { tab: string; q: string; product: string; stage: string; order: string; from: string; to: string; range: string };
const options = {
  product: [["all","All products"],["FLIGHT","Flights"],["HOTEL","Hotels"],["CAR","Cars"],["PACKAGE","Packages"]],
  stage: [["all","All activity types"],["SEARCH_COMPLETED","Search completed"],["RESULTS_VIEWED","Results viewed"],["OFFER_SELECTED","Offer selected"],["PROVIDER_HANDOFF_STARTED","Provider handoff"],["ACCOUNT_ACTIVITY","Account activity"]],
  order: [["newest","Newest first"],["oldest","Oldest first"]],
};
const control = "focus-ring h-11 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A]";
function utcWindow(days: number) {
  const to = new Date();
  return { from: new Date(to.getTime() - days * 86_400_000).toISOString(), to: to.toISOString() };
}
export function ActivityFiltersBar({ path, initial, directory, tabs }: { path: string; initial: Values; directory: string; tabs: ReactNode }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [draftDates, setDraftDates] = useState({ from: initial.from, to: initial.to });
  const [editingCustom, setEditingCustom] = useState(false);
  const [pending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");
  const scope = JSON.stringify([initial.tab, initial.q, initial.product, initial.stage, initial.order, initial.from, initial.to, initial.range]);
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setValues(initial);
    setDraftDates({ from: initial.from, to: initial.to });
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
    if (next.range !== "all") params.set("range", next.range);
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
      setDraftDates({ from: values.range === "custom" ? values.from : "", to: values.range === "custom" ? values.to : "" });
      setEditingCustom(true);
      return;
    }
    setEditingCustom(false);
    const dates = range === "today" ? { from: new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString(), to: new Date().toISOString() }
      : range === "24h" ? utcWindow(1) : range === "7d" ? utcWindow(7) : range === "30d" ? utcWindow(30) : {from:"",to:""};
    update({range, ...dates});
  };
  const validCustom = /^\d{4}-\d{2}-\d{2}$/.test(draftDates.from)
    && /^\d{4}-\d{2}-\d{2}$/.test(draftDates.to)
    && !Number.isNaN(Date.parse(draftDates.from)) && !Number.isNaN(Date.parse(draftDates.to))
    && draftDates.from <= draftDates.to;
  const cancelDates = () => {
    setEditingCustom(false);
    setValues(current => ({...current, range: initial.range, from: initial.from, to: initial.to}));
    setDraftDates({from: initial.from,to: initial.to});
  };
  return <div className="min-w-0 space-y-3">
    <label className="relative block min-w-0">
      <span className="sr-only">Search activity</span>
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#64748B]" />
      <input aria-label="Search activity" value={values.q} maxLength={80} placeholder="Route, destination, or provider"
        onChange={e => update({q:e.target.value})}
        onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
        className="h-11 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] text-[#0F172A] outline-none placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
    </label>
    <div className="min-w-0 border-b border-[#E2E8F0] pb-3">
      {tabs}
      <div className="mt-3 grid min-w-0 grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,180px)_minmax(0,180px)_minmax(0,180px)_auto]">
        <SearchMonitorSelect label="Date range" name="range" value={editingCustom ? "custom" : values.range} options={rangeOptions}
          appearance="fare" onValueChange={setRange} />
        <SearchMonitorSelect label="Activity product" name="product" value={values.product}
          options={options.product.map(([value,label])=>({value,label}))} appearance="fare"
          onValueChange={product=>update({product})} />
        <SearchMonitorSelect label="Activity type" name="stage" value={values.stage}
          options={options.stage.map(([value,label])=>({value,label}))} appearance="fare"
          onValueChange={stage=>update({stage})} />
        <button type="button" onClick={() => navigate((editingCustom || values.range === "custom") && validCustom
          ? { ...values, range: "custom", from: draftDates.from,
              to: draftDates.to } : values)}
          disabled={pending || ((editingCustom || values.range === "custom") && !validCustom)}
          className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60 lg:w-auto">
          Apply filters
        </button>
      </div>
    </div>
    {(editingCustom || values.range === "custom") ? <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-[#64748B]">From (UTC)
        <AdminCalendarInput ariaLabel="Custom start date UTC" value={draftDates.from}
          max={draftDates.to || undefined} onChange={e => { setDraftDates(current => ({...current, from:e.target.value}));
          setValues(current => ({...current, range:"custom", from:e.target.value})); }} className="w-[210px] max-w-full" />
      </label>
      <label className="text-xs text-[#64748B]">To (UTC)
        <AdminCalendarInput ariaLabel="Custom end date UTC" value={draftDates.to}
          min={draftDates.from || undefined} onChange={e => { setDraftDates(current => ({...current, to:e.target.value}));
          setValues(current => ({...current, range:"custom", to:e.target.value})); }} className="w-[210px] max-w-full" />
      </label>
      <button type="button" onClick={cancelDates} className="h-11 px-2 text-[13px] font-medium text-[#475569] hover:underline">Cancel</button>
    </div> : null}
    <span aria-live="polite" className="sr-only">{pending ? "Loading activity…" : ""}</span>
  </div>;
}
