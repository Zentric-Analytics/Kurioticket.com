"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Values = { tab: string; q: string; product: string; stage: string; order: string; from: string; to: string; range: string };
const options = {
  product: [["all","All products"],["FLIGHT","Flights"],["HOTEL","Hotels"],["CAR","Cars"],["PACKAGE","Packages"]],
  stage: [["all","All activity types"],["SEARCH_COMPLETED","Search completed"],["RESULTS_VIEWED","Results viewed"],["OFFER_SELECTED","Offer selected"],["PROVIDER_HANDOFF_STARTED","Provider handoff"],["ACCOUNT_ACTIVITY","Account activity"]],
  order: [["newest","Newest first"],["oldest","Oldest first"]],
};
const control = "focus-ring h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] text-[var(--foreground)]";
function utcWindow(days: number) {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from: start, to: today };
}
export function ActivityFiltersBar({ path, initial, directory, tabs }: { path: string; initial: Values; directory: string; tabs: ReactNode }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [draftDates, setDraftDates] = useState({ from: initial.from, to: initial.to });
  const [pending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");
  useEffect(() => { if (timeout.current) clearTimeout(timeout.current); submitted.current = ""; setValues(initial); setDraftDates({from: initial.from, to: initial.to}); }, [initial.tab, initial.q, initial.product, initial.stage, initial.order, initial.from, initial.to, initial.range]);
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
  const update = (patch: Partial<Values>, debounce = false) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (timeout.current) clearTimeout(timeout.current);
    if (debounce) timeout.current = setTimeout(() => navigate(next), 300);
    else navigate(next);
  };
  const rangeOptions = [
    { value: "all", label: "All dates" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "custom", label: "Custom range" },
  ];
  const setRange = (range: string) => {
    if (range === "custom") {
      setDraftDates({ from: values.from, to: values.to });
      setValues(current => ({...current, range: "custom"}));
      return;
    }
    const dates = range === "7d" ? utcWindow(7) : range === "30d" ? utcWindow(30) : {from:"",to:""};
    update({range, ...dates});
  };
  const validCustom = /^\d{4}-\d{2}-\d{2}$/.test(draftDates.from)
    && /^\d{4}-\d{2}-\d{2}$/.test(draftDates.to)
    && !Number.isNaN(Date.parse(draftDates.from)) && !Number.isNaN(Date.parse(draftDates.to))
    && draftDates.from <= draftDates.to;
  const applyDates = () => {
    if (!validCustom) return;
    update({ range: "custom", ...draftDates });
  };
  const cancelDates = () => {
    setValues(current => ({...current, range: initial.range, from: initial.from, to: initial.to}));
    setDraftDates({from: initial.from,to: initial.to});
  };
  return <div className="min-w-0 space-y-3">
    <label className="relative block min-w-0">
      <span className="sr-only">Search activity</span>
      <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--muted-foreground)]" />
      <input aria-label="Search activity" value={values.q} maxLength={80} placeholder="Route, destination, or provider"
        onChange={e => update({q:e.target.value}, true)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (timeout.current) clearTimeout(timeout.current); navigate(values); } }}
        className="h-11 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white pl-9 pr-3 text-[13px] text-[#020617] outline-none placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B]" />
    </label>
    <div className="flex min-w-0 flex-col gap-x-5 gap-y-2 border-b border-[#D8E1EC] lg:flex-row lg:items-end lg:justify-between">
      {tabs}
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 pb-2 lg:pb-1">
        <SearchMonitorSelect label="Date range" name="range" value={values.range} options={rangeOptions}
          appearance="plain" onValueChange={setRange} />
        <SearchMonitorSelect label="Activity product" name="product" value={values.product}
          options={options.product.map(([value,label])=>({value,label}))} appearance="plain"
          onValueChange={product=>update({product})} />
        <SearchMonitorSelect label="Activity type" name="stage" value={values.stage}
          options={options.stage.map(([value,label])=>({value,label}))} appearance="plain"
          onValueChange={stage=>update({stage})} />
      </div>
    </div>
    {values.range === "custom" ? <div className="flex flex-wrap items-end gap-3">
      <label className="text-xs text-[var(--muted-foreground)]">From (UTC)
        <input type="date" aria-label="Custom start date UTC" value={draftDates.from}
          max={draftDates.to || undefined} onChange={e => setDraftDates(current => ({...current, from:e.target.value}))} className={control}/>
      </label>
      <label className="text-xs text-[var(--muted-foreground)]">To (UTC)
        <input type="date" aria-label="Custom end date UTC" value={draftDates.to}
          min={draftDates.from || undefined} onChange={e => setDraftDates(current => ({...current, to:e.target.value}))} className={control}/>
      </label>
      <button type="button" onClick={applyDates} disabled={!validCustom || pending}
        className="h-11 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Apply dates</button>
      <button type="button" onClick={cancelDates} className="h-11 px-2 text-[13px] font-medium text-[#475569] hover:underline">Cancel</button>
    </div> : null}
    <span aria-live="polite" className="sr-only">{pending ? "Refreshing activity…" : ""}</span>
  </div>;
}
