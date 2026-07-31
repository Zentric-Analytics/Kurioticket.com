"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";

import type { DealsPackageMode } from "@/lib/deals/dealsSearchParams";
import { cn } from "@/lib/utils";

export type DealsPackageSort =
  | "recommended"
  | "lowest-total"
  | "shortest-flight"
  | "highest-hotel"
  | "highest-car";

type DealsPackageResultsToolbarProps = {
  count: number;
  mode: DealsPackageMode;
  value: DealsPackageSort;
  onChange: (value: DealsPackageSort) => void;
};

export function DealsPackageResultsToolbar({
  count,
  mode,
  value,
  onChange,
}: DealsPackageResultsToolbarProps) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuId = useId();
  const sortWrapperRef = useRef<HTMLDivElement | null>(null);
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sortOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sortOptions = useMemo(
    () =>
      [
        { value: "recommended", label: "Recommended", visible: true },
        {
          value: "lowest-total",
          label: "Lowest combined total",
          visible: true,
        },
        {
          value: "shortest-flight",
          label: "Shortest flight",
          visible: mode !== "hotel-car",
        },
        {
          value: "highest-hotel",
          label: "Highest-rated hotel",
          visible: mode !== "flight-car",
        },
        {
          value: "highest-car",
          label: "Highest-rated car supplier",
          visible: mode !== "hotel-flight",
        },
      ].filter((option) => option.visible) as Array<{
        value: DealsPackageSort;
        label: string;
      }>,
    [mode],
  );
  const currentSortLabel =
    sortOptions.find((option) => option.value === value)?.label ??
    sortOptions[0]?.label ??
    "";

  const focusSortOption = useCallback(
    (index: number) => {
      const optionCount = sortOptions.length;

      if (!optionCount) return;

      const nextIndex = (index + optionCount) % optionCount;
      sortOptionRefs.current[nextIndex]?.focus();
    },
    [sortOptions.length],
  );

  const openSortMenu = useCallback(() => {
    setSortMenuOpen(true);

    window.requestAnimationFrame(() => {
      const selectedIndex = sortOptions.findIndex(
        (option) => option.value === value,
      );

      sortOptionRefs.current[Math.max(selectedIndex, 0)]?.focus({
        preventScroll: true,
      });
    });
  }, [sortOptions, value]);

  const closeSortMenu = useCallback((returnFocus = false) => {
    setSortMenuOpen(false);

    if (returnFocus) {
      sortTriggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const handleSortTriggerClick = useCallback(() => {
    if (sortMenuOpen) {
      closeSortMenu();
      return;
    }

    openSortMenu();
  }, [closeSortMenu, openSortMenu, sortMenuOpen]);

  const handleSortOptionKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusSortOption(index + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusSortOption(index - 1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusSortOption(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusSortOption(sortOptions.length - 1);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeSortMenu(true);
      }
    },
    [closeSortMenu, focusSortOption, sortOptions.length],
  );

  useEffect(() => {
    if (!sortMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (sortWrapperRef.current?.contains(target)) return;

      setSortMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setSortMenuOpen(false);
      sortTriggerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortMenuOpen]);

  return (
    <div className="mt-5 flex flex-col gap-3 border-y border-slate-200 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-bold text-slate-700">
        {count} complete trip {count === 1 ? "option" : "options"}
      </p>

      <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 whitespace-nowrap sm:gap-2">
        <span className="whitespace-nowrap text-[clamp(0.68rem,3vw,0.875rem)] font-semibold text-slate-700 sm:text-base">
          Sort by:
        </span>

        <div
          ref={sortWrapperRef}
          className="relative inline-flex shrink-0 items-center whitespace-nowrap"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setSortMenuOpen(false);
            }
          }}
        >
          <button
            ref={sortTriggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={sortMenuOpen}
            aria-controls={sortMenuId}
            className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap bg-transparent py-1 text-[clamp(0.75rem,3.3vw,1rem)] font-bold text-slate-950 outline-none transition-colors hover:text-[#004BB8] focus-visible:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 focus-visible:ring-offset-2 sm:gap-2 sm:pl-1 sm:text-lg"
            onClick={handleSortTriggerClick}
          >
            <span>{currentSortLabel}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-4 w-4 text-slate-700 transition-transform sm:h-[18px] sm:w-[18px]",
                sortMenuOpen && "rotate-180",
              )}
              strokeWidth={2.25}
            />
          </button>

          {sortMenuOpen ? (
            <div
              id={sortMenuId}
              role="listbox"
              aria-label="Sort by"
              className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_38px_-18px_rgba(15,23,42,0.35)]"
            >
              {sortOptions.map((option, index) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      sortOptionRefs.current[index] = element;
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-medium leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30",
                      selected
                        ? "bg-[#004BB8]/[0.08] text-[#004BB8]"
                        : "text-slate-800 hover:bg-slate-50 hover:text-slate-950",
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setSortMenuOpen(false);
                      sortTriggerRef.current?.focus({ preventScroll: true });
                    }}
                    onKeyDown={(event) =>
                      handleSortOptionKeyDown(event, index)
                    }
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {selected ? (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2.25}
                        />
                      ) : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
