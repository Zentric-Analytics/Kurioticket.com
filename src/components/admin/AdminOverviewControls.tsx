"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, LoaderCircle } from "lucide-react";

export type OverviewRange = "24h" | "7d" | "30d";

const rangeLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

// One navigation state drives the selector and time-range-dependent summaries.
// Current-range values remain authoritative until the new server data commits.
type RangeTransitionValue = {
  range: OverviewRange;
  requestedRange: OverviewRange | null;
  isUpdating: boolean;
  error: string | null;
  selectRange: (range: OverviewRange) => void;
};
const RangeTransitionContext = createContext<RangeTransitionValue | null>(null);

export function AdminOverviewRangeTransitionProvider({ range, children }: { range: OverviewRange; children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestedRange, setRequestedRange] = useState<OverviewRange | null>(null);
  const [failedRange, setFailedRange] = useState<OverviewRange | null>(null);
  const sawPending = useRef(false);
  const isUpdating = requestedRange !== null && requestedRange !== range;

  useEffect(() => {
    if (requestedRange !== null && requestedRange === range) {
      sawPending.current = false;
      setRequestedRange(null);
    }
  }, [range, requestedRange]);

  useEffect(() => {
    if (isPending) {
      sawPending.current = true;
    } else if (sawPending.current && isUpdating) {
      // Navigation ended without a new reporting period committing.
      sawPending.current = false;
      setFailedRange(requestedRange);
      setRequestedRange(null);
    }
  }, [isPending, isUpdating, requestedRange]);

  const selectRange = (nextRange: OverviewRange) => {
    if (isUpdating || isPending || nextRange === range) return;
    setFailedRange(null);
    setRequestedRange(nextRange);
    sawPending.current = false;
    startTransition(() => {
      router.push(nextRange === "24h" ? "/admin" : "/admin?range=" + encodeURIComponent(nextRange));
    });
  };

  return (
    <RangeTransitionContext.Provider value={{
      range,
      requestedRange,
      isUpdating,
      error: failedRange === null ? null : "Unable to load " + rangeLabels[failedRange] + ". Please try again.",
      selectRange,
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

// Keep the established one-minute refresh even though the visible top toolbar
// has been removed. Historical aggregates are still fetched from the server.
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

// The selector stays beside Operations Snapshot. A small custom listbox replaces
// the OS-dependent native options menu so its typography and focus are consistent.
const rangeOptions: OverviewRange[] = ["24h", "7d", "30d"];

export function AdminOverviewRangeSelect({ range }: { range: OverviewRange }) {
  const transition = useContext(RangeTransitionContext);
  if (!transition) throw new Error("AdminOverviewRangeSelect must be inside AdminOverviewRangeTransitionProvider");
  const pending = transition.isUpdating;
  const requestedRange = transition.requestedRange;
  const [open, setOpen] = useState(false);
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
    initialFocusIndex.current = Math.max(0, rangeOptions.indexOf(range));
    setOpen(true);
  };

  const selectRange = (nextRange: OverviewRange) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (nextRange === range) return;
    transition.selectRange(nextRange);
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

  return (
    <div ref={containerRef} className="relative z-20 shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={pending && requestedRange ? "Updating Overview to " + rangeLabels[requestedRange] : "Overview reporting range: " + rangeLabels[range]}
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
        <span className="min-w-0 flex-1 text-left">{pending ? "Updating…" : rangeLabels[range]}</span>
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
    </div>
  );
}
