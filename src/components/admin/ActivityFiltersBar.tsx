"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { SearchMonitorSelect } from "./SearchMonitorSelect";
import { AdminCalendarInput } from "./AdminCalendarInput";
import { adminCalendarRange, formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { displayActivityCalendarDate } from "@/lib/adminActivityDateQuery";
import { ADMIN_REPORTING_RANGE_OPTIONS } from "@/lib/adminReportingRanges";
import { activityInterfaceOptions } from "@/lib/adminIdentityActivity";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type ActivityFilterValues = { tab: string; q: string; product: string; stage: string; order: string; from: string; to: string; range: string; interface?: string };
const options = {
  product: [["all","All products"],["FLIGHT","Flights"],["HOTEL","Hotels"],["CAR","Cars"],["PACKAGE","Packages"]],
  stage: [["all","All activity types"],["SEARCH_COMPLETED","Search completed"],["PACKAGE_SEARCH_SUBMITTED","Package search submitted"],["RESULTS_VIEWED","Results viewed"],["SEARCH_EDIT_APPLIED","Search edit submitted"],["SEARCH_FILTER_APPLIED","Results filter applied"],["SEARCH_SORT_CHANGED","Results sort changed"],["FLIGHT_DETAILS_VIEWED","Flight details viewed"],["RESULT_DETAILS_OPENED","Result details opened"],["RATE_DETAILS_OPENED","Rate details opened"],["OFFER_SELECTED","Offer selected"],["PROVIDER_DEAL_SELECTED","Provider deal selected"],["PROVIDER_HANDOFF_STARTED","Provider handoff"],["RESULT_SAVED","Result saved"],["RESULT_UNSAVED","Result unsaved"],["RESULT_SHARED","Share activity"],["PRICE_ALERT_CREATED","Price alert created"],["ACCOUNT_ACTIVITY","Account activity"],["PAGE_VIEW","Page viewed"],["ADMIN_SECURITY_AUDIT","Administrative security audit"]],
};
const labelFor = (items: string[][], value: string) => items.find(([key]) => key === value)?.[1] ?? value;

export function ActivityFiltersBar({ path, initial, directory, usersReturn, tabs, timeZone, now, unavailableReason, compact = false, availableStages, allowInterface = false }: {
  path: string; initial: ActivityFilterValues; directory: string; usersReturn?: string; tabs: ReactNode;
  timeZone: string; now: string; unavailableReason?: string; compact?: boolean; availableStages?: readonly string[]; allowInterface?: boolean;
}) {
  const unavailableId = useId();
  const panelId = useId();
  const disabled = Boolean(unavailableReason);
  const initialDates = {
    from: displayActivityCalendarDate(initial.from, timeZone),
    to: displayActivityCalendarDate(initial.to, timeZone, true),
  };
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [draftDates, setDraftDates] = useState(initialDates);
  const [editingCustom, setEditingCustom] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  // A rolling server cutoff changes on every refresh. It is not a changed
  // applied filter and must never reset an administrator's unfinished draft.
  const scope = JSON.stringify([path, initial.tab, initial.q, initial.product, initial.stage, initial.order, initial.interface,
    initial.range, initial.range === "custom" ? initial.from : "", initial.range === "custom" ? initial.to : "",
    timeZone, directory, usersReturn]);
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setValues(initial);
    setDraftDates(initialDates);
    setEditingCustom(false);
  }
  const navigate = (next: ActivityFilterValues) => {
    if (disabled) return;
    const params = new URLSearchParams();
    if (directory) params.set("directory", directory);
    if (usersReturn) params.set("usersReturn", usersReturn);
    if (next.tab !== "all") params.set("tab", next.tab);
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.product !== "all") params.set("product", next.product);
    if (next.interface && next.interface !== "all") params.set("interface", next.interface);
    if (next.stage !== "all") { params.set("stage", next.stage); params.set("type", next.stage); }
    if (next.order !== "newest") { params.set("order", next.order); params.set("sort", next.order); }
    params.set("range", next.range);
    // Presets remain live; only custom reporting windows carry fixed bounds.
    if (next.range === "custom") {
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
    }
    const url = path + "?" + params.toString();
    startTransition(() => router.replace(url, { scroll: false }));
  };
  const update = (patch: Partial<ActivityFilterValues>) => setValues(current => ({ ...current, ...patch }));
  const rangeOptions = disabled ? [{ value: "unavailable", label: "Unavailable" }]
    : [...ADMIN_REPORTING_RANGE_OPTIONS,
      ...(values.range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : [])];
  const setRange = (range: string) => {
    if (range === "custom") {
      setDraftDates(values.range === "custom" ? draftDates : { from: "", to: "" });
      setEditingCustom(true);
      return;
    }
    setEditingCustom(false);
    update({ range, from: "", to: "" });
  };
  const accessOrPages = values.tab === "access" || values.tab === "pages";
  const showInterface = allowInterface && !compact && !accessOrPages;
  const validCustom = Boolean(adminCalendarRange(draftDates.from, draftDates.to, timeZone));
  const customDates = initial.range === "custom" && draftDates.from === initialDates.from && draftDates.to === initialDates.to
    ? { from: initial.from, to: initial.to } : draftDates;
  const apply = () => {
    if (disabled || pending) return;
    if ((editingCustom || values.range === "custom") && !validCustom) return;
    navigate((editingCustom || values.range === "custom") ? { ...values, range: "custom", ...customDates } : values);
  };
  const cancelDates = () => {
    setEditingCustom(false);
    setValues(current => ({...current, range: initial.range, from: initial.from, to: initial.to}));
    setDraftDates(initialDates);
  };
  const rangeLabel = initial.range === "custom"
    ? initialDates.from + " to " + initialDates.to
    : [...ADMIN_REPORTING_RANGE_OPTIONS, {value:"24h",label:"Last 24 hrs"}].find(option => option.value === initial.range)?.label ?? "Today";
  const chips: {label: string; clear?: Partial<ActivityFilterValues>}[] = [
    ...(initial.range !== "today" ? [{label:rangeLabel,clear:{range:"today",from:"",to:""}}] : []),
    ...(initial.q ? [{label:'Search: ' + initial.q,clear:{q:""}}] : []),
    ...(initial.product !== "all" ? [{label:labelFor(options.product, initial.product),clear:{product:"all"}}] : []),
    ...(initial.stage !== "all" ? [{label:labelFor(options.stage, initial.stage),clear:{stage:"all"}}] : []),
    ...(initial.interface && initial.interface !== "all" ? [{label:activityInterfaceOptions.find(option => option.value === initial.interface)?.label ?? "Interface",clear:{interface:"all"}}] : []),
  ];
  return <div className="min-w-0 space-y-3" data-users-navigation-pending={pending ? "true" : undefined}>
    {!compact ? <div className={"flex min-w-0 flex-wrap items-center justify-between gap-2" + (!chips.length || disabled ? " md:hidden" : "")}>
      <div aria-label="Applied activity filters" className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {!disabled ? chips.map(chip => <span key={chip.label} className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-full bg-[#F1F5F9] py-1 pl-3 pr-2 text-[12px] text-[#475569]">
          <span className="break-words [overflow-wrap:anywhere]">{chip.label}</span>
          {chip.clear ? <button type="button" disabled={pending} aria-label={"Remove filter: " + chip.label}
            onClick={() => navigate({...initial,...chip.clear})} className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[#E2E8F0]"><X size={13} aria-hidden="true"/></button> : null}
        </span>) : null}
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(value => !value)}
        className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 text-[13px] font-medium text-[#334155] md:hidden"><SlidersHorizontal size={16} aria-hidden="true"/> Filters</button>
    </div> : null}
    <div id={panelId} className={compact || expanded ? "min-w-0 space-y-3" : "hidden min-w-0 space-y-3 md:block"}>
      <div data-testid="activity-filters-row" className={"grid min-w-0 grid-cols-1 items-end gap-2 [&_button]:min-h-11 " + (compact ? "min-[420px]:grid-cols-[minmax(0,1fr)_auto]" : accessOrPages ? "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]" : showInterface ? "sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]" : "sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]")}>
      {!compact ? <label className={"relative block min-w-0" + (!accessOrPages ? " col-span-full" : "")}>
        <span className="sr-only">Search activity</span>
        <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#64748B]"/>
        <input aria-label="Search activity" value={values.q} maxLength={80} disabled={disabled}
          aria-describedby={disabled ? unavailableId : undefined}
          placeholder={values.tab === "access" ? "Platform or access type" : values.tab === "pages" ? "Page or screen" : "Route, destination, provider or action"}
          onChange={event => update({q:event.target.value})}
          onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); apply(); } }}
          className="h-11 w-full min-w-0 rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-base text-[#0F172A] outline-none placeholder:text-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748B] disabled:cursor-not-allowed disabled:opacity-75 md:text-[13px]"/>
      </label> : null}
        <SearchMonitorSelect label="Date range" name="range" disabled={disabled} value={disabled ? "unavailable" : editingCustom ? "custom" : values.range} options={rangeOptions}
          appearance="fare" timeZoneLabel={formatAdminTimeZoneLabel(timeZone, new Date(now))} onValueChange={setRange}/>
        {!compact && !accessOrPages ? <><SearchMonitorSelect label="Activity product" name="product" disabled={disabled} value={values.product}
          options={options.product.map(([value,label])=>({value,label}))} appearance="fare" truncateLabel onValueChange={product=>update({product})}/>
          <SearchMonitorSelect label="Activity type" name="stage" disabled={disabled} value={values.stage}
            options={options.stage.filter(([value]) => allowInterface || value !== "ADMIN_SECURITY_AUDIT")
              .map(([value,label])=>({value,label,disabled:availableStages && value !== "all" && !availableStages.includes(value)}))} appearance="fare" truncateLabel onValueChange={stage=>update({stage})}/></> : null}
        {showInterface ? <SearchMonitorSelect label="Activity interface" name="interface" disabled={disabled} value={values.interface ?? "all"}
          options={[...activityInterfaceOptions]} appearance="fare" truncateLabel onValueChange={value=>update({interface:value})}/> : null}
        <button type="button" onClick={apply} disabled={disabled || pending || ((editingCustom || values.range === "custom") && !validCustom)}
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] disabled:opacity-60">{compact ? "Apply period" : "Apply filters"}</button>
      </div>
      {!disabled && (editingCustom || values.range === "custom") ? <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 text-[12px] text-[#64748B]">From
          <AdminCalendarInput timeZone={timeZone} ariaLabel="Custom start date" value={draftDates.from}
            max={draftDates.to || undefined} onChange={event => { setDraftDates(current => ({...current, from:event.target.value}));
              setValues(current => ({...current, range:"custom", from:event.target.value})); }} className="w-[210px] max-w-full"/>
        </label>
        <label className="min-w-0 text-[12px] text-[#64748B]">To
          <AdminCalendarInput timeZone={timeZone} ariaLabel="Custom end date" value={draftDates.to}
            min={draftDates.from || undefined} onChange={event => { setDraftDates(current => ({...current, to:event.target.value}));
              setValues(current => ({...current, range:"custom", to:event.target.value})); }} className="w-[210px] max-w-full"/>
        </label>
        <button type="button" onClick={cancelDates} className="focus-ring h-11 rounded-md px-2 text-[13px] font-medium text-[#475569] hover:underline">Cancel</button>
      </div> : null}
    </div>
    {unavailableReason ? <p id={unavailableId} className="text-[13px] leading-5 text-[#64748B]">{unavailableReason}</p> : null}
    {tabs ? <div data-testid="activity-tabs-after-filters" className="min-w-0 border-b border-[#E2E8F0] pt-1">{tabs}</div> : null}
    <span aria-live="polite" className="sr-only">{pending ? "Loading activity…" : ""}</span>
  </div>;
}
