"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { AdminCalendarInput } from "@/components/admin/AdminCalendarInput";
import { overviewPeriodHref, validOverviewCustomDates, type OverviewCustomDates, type OverviewPeriod, type OverviewRange } from "@/lib/adminOverviewRange";

const rangeLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hrs",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

// One navigation state drives the selector and time-range-dependent summaries.
// Current-range values remain authoritative until the new server data commits.
type RangeTransitionValue = {
  requestedPeriod: OverviewPeriod | null;
  isUpdating: boolean;
  error: string | null;
  selectPeriod: (period: OverviewPeriod) => void;
};
const RangeTransitionContext = createContext<RangeTransitionValue | null>(null);

export function AdminOverviewRangeTransitionProvider({ period, children }: { period: OverviewPeriod; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestedPeriod, setRequestedPeriod] = useState<OverviewPeriod | null>(null);
  const [failedPeriod, setFailedPeriod] = useState<OverviewPeriod | null>(null);
  const [wasPending, setWasPending] = useState(isPending);
  const href = overviewPeriodHref(period);
  const isUpdating = requestedPeriod !== null && overviewPeriodHref(requestedPeriod) !== href;

  if (wasPending !== isPending) {
    setWasPending(isPending);
    if (!isPending && isUpdating) {
      // Navigation ended without a new reporting period committing.
      setFailedPeriod(requestedPeriod);
      setRequestedPeriod(null);
    }
  }
  if (requestedPeriod !== null && !isUpdating) setRequestedPeriod(null);

  const selectPeriod = (nextPeriod: OverviewPeriod) => {
    const nextHref = overviewPeriodHref(nextPeriod);
    if (isUpdating || isPending || nextHref === href) return;
    setFailedPeriod(null);
    setRequestedPeriod(nextPeriod);
    startTransition(() => {
      router.push(nextHref);
    });
  };

  return (
    <RangeTransitionContext.Provider value={{
      requestedPeriod,
      isUpdating,
      error: failedPeriod === null ? null : "Unable to load " + rangeLabels[failedPeriod.range] + ". Please try again.",
      selectPeriod,
    }}>
      {children}
    </RangeTransitionContext.Provider>
  );
}

// Only time-filtered summaries are muted while new data is requested.
export function AdminOverviewRangeSensitive({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  const transition = useContext(RangeTransitionContext);
  const updating = transition?.isUpdating ?? false;
  return (
    <div
      aria-busy={updating || undefined}
      data-range-updating={updating ? "true" : "false"}
      className={"relative min-w-0 " + (fill ? "h-full" : "")}
    >
      <div
        inert={updating}
        className={(fill ? "h-full " : "") + "transition-opacity duration-150 " + (updating ? "opacity-45" : "opacity-100")}
      >
        {children}
      </div>
      {updating ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg bg-slate-100/20 motion-safe:animate-pulse" />
      ) : null}
    </div>
  );
}

// Refresh current presence and historical totals without replacing the selected period.
export function AdminOverviewAutoRefresh() {
  const router = useRouter();
  const transition = useContext(RangeTransitionContext);
  const isUpdating = transition?.isUpdating ?? false;

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isUpdating && document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router, isUpdating]);

  return null;
}

const rangeOptions: OverviewRange[] = ["24h", "7d", "30d", "custom"];

export function AdminOverviewRangeSelect({ period, nowDate }: { period: OverviewPeriod; nowDate: string }) {
  const transition = useContext(RangeTransitionContext);
  if (!transition) throw new Error("AdminOverviewRangeSelect must be inside AdminOverviewRangeTransitionProvider");
  const pending = transition.isUpdating;
  const { range } = period;
  const requestedRange = transition.requestedPeriod?.range;
  const [open, setOpen] = useState(false);
  const [draftDates, setDraftDates] = useState<OverviewCustomDates | null>(null);
  const href = overviewPeriodHref(period);
  const [previousHref, setPreviousHref] = useState(href);
  if (previousHref !== href) {
    setPreviousHref(href);
    setDraftDates(null);
    setOpen(false);
  }
  const datePanelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialFocusIndex = useRef(0);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    optionRefs.current[initialFocusIndex.current]?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openMenu = () => {
    setDraftDates(null);
    initialFocusIndex.current = Math.max(0, rangeOptions.indexOf(range));
    setOpen(true);
  };

  const selectRange = (nextRange: OverviewRange) => {
    setOpen(false);
    if (nextRange === "custom") {
      setDraftDates(period.range === "custom"
        ? { fromDate: period.fromDate, toDate: period.toDate }
        : { fromDate: "", toDate: "" });
      return;
    }
    setDraftDates(null);
    triggerRef.current?.focus();
    transition.selectPeriod({ range: nextRange });
  };

  const closeDates = () => {
    setDraftDates(null);
    triggerRef.current?.focus();
  };

  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex: number | null = null;
    if (event.key === "ArrowDown") targetIndex = (index + 1) % rangeOptions.length;
    if (event.key === "ArrowUp") targetIndex = (index + rangeOptions.length - 1) % rangeOptions.length;
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = rangeOptions.length - 1;
    if (targetIndex !== null) {
      event.preventDefault();
      optionRefs.current[targetIndex]?.focus();
    }
    if (event.key === "Tab") setOpen(false);
  };

  const validDraft = draftDates !== null && validOverviewCustomDates(draftDates, nowDate);
  const selectionLabel = period.range === "custom"
    ? "Custom range · " + period.fromDate + " to " + period.toDate
    : rangeLabels[range];

  return (
    <div ref={containerRef} className="relative z-20 flex max-w-full flex-col items-end gap-2">
      <button
        ref={triggerRef}
        type="button"
        aria-label={pending && requestedRange ? "Updating Overview to " + rangeLabels[requestedRange] : "Overview reporting range: " + selectionLabel}
        aria-busy={pending || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={pending}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
        className="inline-flex h-9 min-w-[145px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-medium leading-none text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? <LoaderCircle size={14} className="shrink-0 text-indigo-600 motion-safe:animate-spin" aria-hidden="true" />
          : <CalendarDays size={14} className="shrink-0 text-indigo-600" aria-hidden="true" />
        }
        <span className="min-w-0 flex-1 text-left">{pending ? "Updating…" : selectionLabel}</span>
        <ChevronDown size={13} className={"ml-1 shrink-0 text-slate-500 transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {pending && requestedRange ? "Updating to " + rangeLabels[requestedRange] + ". The previous reporting period is still shown." : ""}
      </span>
      {transition.error ? (
        <span role="alert" className="absolute right-0 top-full mt-1.5 max-w-[260px] rounded-lg border border-rose-200 bg-white p-2 text-[11px] leading-4 text-rose-800 shadow-sm">
          {transition.error}
        </span>
      ) : null}
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Overview reporting range options"
          className="absolute right-0 top-full z-50 mt-1.5 w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10"
        >
          {rangeOptions.map((option, index) => {
            const selected = option === range;
            return (
              <button
                key={option}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={-1}
                onClick={() => selectRange(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={"flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[11px] font-medium transition-colors focus:bg-slate-100 focus:outline-none " +
                  (selected ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50")}
              >
                <span>{rangeLabels[option]}</span>
                {selected ? <Check size={14} className="shrink-0 text-indigo-600" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {draftDates ? (
        <form aria-labelledby={datePanelId}
          className="absolute right-0 top-full z-40 mt-2 flex w-[min(440px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-wrap items-end justify-end gap-2 rounded-xl border border-[#CAD6E5] bg-white p-3 shadow-[0_16px_40px_-14px_rgba(2,6,23,0.24)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!validDraft) return;
            closeDates();
            transition.selectPeriod({ range: "custom", ...draftDates });
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              closeDates();
            }
          }}
        >
          <span className="sr-only" id={datePanelId}>Custom reporting dates</span>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
            From (UTC)
            <AdminCalendarInput ariaLabel="From (UTC)" value={draftDates.fromDate} max={draftDates.toDate || nowDate}
              onChange={(event) => setDraftDates({ ...draftDates, fromDate: event.target.value })}
              className="w-[180px] max-w-full" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
            To (UTC)
            <AdminCalendarInput ariaLabel="To (UTC)" value={draftDates.toDate} min={draftDates.fromDate || undefined} max={nowDate}
              onChange={(event) => setDraftDates({ ...draftDates, toDate: event.target.value })}
              className="w-[180px] max-w-full" />
          </label>
          <button type="submit" disabled={pending || !validDraft}
            className="h-9 rounded-lg bg-[#004BB8] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
            Apply dates
          </button>
          <button type="button" onClick={closeDates}
            className="focus-ring h-9 rounded-lg px-2 text-xs font-medium text-slate-700 hover:underline">
            Cancel
          </button>
          {draftDates.fromDate && draftDates.toDate && !validDraft ? (
            <p role="status" className="basis-full text-right text-[11px] text-rose-800">Choose up to 90 days, ending no later than today.</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
