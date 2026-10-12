"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { defaultRangeExtractor, useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

const measurements = new Map<string, VirtualItem[]>();
export const resultIdKey = (item: { id: string }) => item.id;

const subscribeViewport = (update: () => void) => {
  const query = window.matchMedia("(max-width: 639px)");
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
};
const mobileViewport = () => window.matchMedia("(max-width: 639px)").matches;
const serverViewport = () => false;
export function ResultsViewport({ mobile, children }: { mobile: boolean; children: ReactNode }) {
  const isMobile = useSyncExternalStore(subscribeViewport, mobileViewport, serverViewport);
  return isMobile === mobile ? children : null;
}

/** Window scrolling stays continuous; only nearby cards are mounted. The full
 * inventory remains in the caller for sorting, filters and result counts. */
export function VirtualResultsList<T>({ items, itemKey, renderItem, estimateHeight = 320, label, rowClassName = "pb-4" }: {
  items: readonly T[];
  itemKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  estimateHeight?: number;
  label: string;
  rowClassName?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focusRequest = useRef<{ index: number; last: boolean } | null>(null);
  const indexByKey = useMemo(() => new Map(items.map((item, index) => [itemKey(item), index])), [items, itemKey]);
  const measurementKey = useMemo(() => `${label}:${typeof window === "undefined" ? 0 : window.innerWidth}:${Array.from(indexByKey.keys()).join("|")}`, [indexByKey, label]);
  const focusedIndex = focusedKey === null ? undefined : indexByKey.get(focusedKey);
  const getItemKey = useCallback((index: number) => itemKey(items[index]), [items, itemKey]);
  const rangeExtractor = useCallback((range: Parameters<typeof defaultRangeExtractor>[0]) => {
    const indices = defaultRangeExtractor(range);
    if (focusedIndex !== undefined && !indices.includes(focusedIndex)) indices.push(focusedIndex);
    return indices.sort((a, b) => a - b);
  }, [focusedIndex]);
  const virtualizer = useWindowVirtualizer({
    count: items.length, getItemKey, estimateSize: () => estimateHeight,
    overscan: 4, scrollMargin, rangeExtractor,
    initialRect: { width: 1200, height: 900 },
    initialMeasurementsCache: measurements.get(measurementKey),
  });
  useLayoutEffect(() => () => {
    const snapshot = virtualizer.takeSnapshot();
    if (!snapshot.every(row => items[row.index] !== undefined && row.key === itemKey(items[row.index]))) return;
    measurements.delete(measurementKey);
    measurements.set(measurementKey, snapshot);
    while (measurements.size > 8) measurements.delete(measurements.keys().next().value!);
  }, [items, itemKey, measurementKey, virtualizer]);
  useLayoutEffect(() => {
    let frame = 0;
    let previousWidth = 0;
    const update = () => {
      frame = 0;
      const element = root.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      setScrollMargin(previous => Math.abs(previous - top) > 1 ? top : previous);
      if (previousWidth && Math.abs(previousWidth - rect.width) > 1) virtualizer.measure();
      previousWidth = rect.width;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    const observer = new ResizeObserver(schedule);
    if (root.current) observer.observe(root.current);
    observer.observe(document.body);
    window.addEventListener("resize", schedule);
    return () => { observer.disconnect(); window.removeEventListener("resize", schedule); cancelAnimationFrame(frame); };
  }, [virtualizer]);

  const rows = virtualizer.getVirtualItems();
  useLayoutEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    const row = root.current?.querySelector<HTMLElement>(`[data-virtual-index="${request.index}"]`);
    if (!row) return;
    const targets = Array.from(row.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex='0']"))
      .filter(target => target.getBoundingClientRect().width > 0);
    const target = request.last ? targets.at(-1) : targets[0];
    (target ?? row).focus({ preventScroll: true });
    focusRequest.current = null;
  });
  const moveAtBoundary = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>("[data-virtual-index]");
    if (!row) return;
    const index = Number(row.dataset.virtualIndex);
    const targets = Array.from(row.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex='0']"))
      .filter(element => element.getBoundingClientRect().width > 0);
    const boundary = event.shiftKey ? targets[0] : targets.at(-1);
    const next = index + (event.shiftKey ? -1 : 1);
    if (target !== boundary || next < 0 || next >= items.length) return;
    const nextRow = root.current?.querySelector(`[data-virtual-index="${next}"]`);
    if (nextRow) return;
    event.preventDefault();
    focusRequest.current = { index: next, last: event.shiftKey };
    virtualizer.scrollToIndex(next, { align: "auto" });
  };

  return <div ref={root} role="list" aria-label={label} data-virtual-results data-total-results={items.length}
    onKeyDownCapture={moveAtBoundary}
    onFocusCapture={event => {
      const row = (event.target as HTMLElement).closest<HTMLElement>("[data-virtual-index]");
      if (row) setFocusedKey(row.dataset.resultKey ?? null);
    }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedKey(null); }}
    style={{ position: "relative", height: virtualizer.getTotalSize(), overflowAnchor: "none" }}>
    {rows.map(row => <div key={row.key} ref={virtualizer.measureElement} data-index={row.index} data-virtual-index={row.index} className={rowClassName}
      data-result-key={itemKey(items[row.index])} role="listitem" aria-posinset={row.index + 1} aria-setsize={items.length} tabIndex={-1}
      style={{ position: "absolute", top: 0, left: 0, width: "100%",
        transform: `translateY(${row.start - scrollMargin}px)` }}>
      {renderItem(items[row.index], row.index)}
    </div>)}
  </div>;
}
