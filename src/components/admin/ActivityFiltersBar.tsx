"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
export function ActivityFiltersBar({ path, initial, directory }: { path: string; initial: Values; directory: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef("");
  useEffect(() => { setValues(initial); }, [initial.tab, initial.q, initial.product, initial.stage, initial.order, initial.from, initial.to, initial.range]);
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
  const active = Boolean(values.q || values.product !== "all" || values.stage !== "all" || values.range !== "all" || values.order !== "newest");
  const select = (name: "product" | "stage" | "order", label: string) => <select aria-label={label} className={control} value={values[name]}
      onChange={event => update({ [name]: event.target.value })}>
      {options[name].map(([value,text]) => <option key={value} value={value}>{text}</option>)}
    </select>;
  return <div className="min-w-0 space-y-2">
    <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-[minmax(180px,1fr)_repeat(4,minmax(125px,auto))]">
      <label className="relative col-span-2 min-w-0 md:col-span-1">
        <span className="sr-only">Search activity</span>
        <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3.5 text-[var(--muted-foreground)]" />
        <input aria-label="Search activity" value={values.q} maxLength={80} placeholder="Route, destination, or provider"
          onChange={e => update({q:e.target.value}, true)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (timeout.current) clearTimeout(timeout.current); navigate(values); } }}
          className={control + " pl-9"} />
      </label>
      <select aria-label="Date range" className={control} value={values.range} onChange={e => {
        const range = e.target.value;
        const dates = range === "7d" ? utcWindow(7) : range === "30d" ? utcWindow(30) : range === "all" ? {from:"",to:""} : {from:values.from,to:values.to};
        update({range, ...dates});
      }}>
        <option value="all">All dates</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom range</option>
      </select>
      {select("product","Activity product")}
      {select("stage","Activity type")}
      {select("order","Sort activity")}
    </div>
    {values.range === "custom" ? <div className="flex flex-wrap gap-2">
      <label className="text-xs text-[var(--muted-foreground)]">From (UTC)<input type="date" aria-label="Custom start date UTC" value={values.from} max={values.to || undefined} onChange={e => update({from:e.target.value})} className={control}/></label>
      <label className="text-xs text-[var(--muted-foreground)]">To (UTC)<input type="date" aria-label="Custom end date UTC" value={values.to} min={values.from || undefined} onChange={e => update({to:e.target.value})} className={control}/></label>
    </div> : null}
    <div className="flex min-h-5 justify-between text-xs">
      <span aria-live="polite" className="text-[var(--muted-foreground)]">{pending ? "Refreshing activity…" : ""}</span>
      {active ? <button type="button" className="focus-ring font-medium text-[var(--primary)] hover:underline" onClick={() => update({q:"",range:"all",from:"",to:"",product:"all",stage:"all",order:"newest"})}>Clear filters</button> : null}
    </div>
  </div>;
}
