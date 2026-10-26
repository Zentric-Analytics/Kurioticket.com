"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown } from "lucide-react";

export type OverviewRange = "24h" | "7d" | "30d";

const rangeLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

// Keep the established one-minute refresh even though the visible top toolbar
// has been removed. Historical aggregates are still fetched from the server.
export function AdminOverviewAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return null;
}

// The selector stays beside Operations Snapshot. A small custom listbox replaces
// the OS-dependent native options menu so its typography and focus are consistent.
const rangeOptions: OverviewRange[] = ["24h", "7d", "30d"];

export function AdminOverviewRangeSelect({ range }: { range: OverviewRange }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
    startTransition(() => {
      router.push(nextRange === "7d" ? "/admin" : "/admin?range=" + encodeURIComponent(nextRange));
    });
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
        aria-label={"Overview reporting range: " + rangeLabels[range]}
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
        className="inline-flex h-9 min-w-[145px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium leading-none text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300 disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarDays size={14} className="shrink-0 text-indigo-600" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-left">{rangeLabels[range]}</span>
        <ChevronDown size={13} className={"ml-1 shrink-0 text-slate-500 transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />
      </button>

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
                className={"flex h-9 w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[12px] font-medium transition-colors focus:bg-slate-100 focus:outline-none " +
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
