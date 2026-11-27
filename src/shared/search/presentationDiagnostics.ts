import { createSearchDiagnostics, type SearchDiagnosticProduct } from "./diagnostics";
/** Viewability is a native list callback, NOT proof of a presented pixel frame. */
export function createSearchPresentationDiagnostics(product: SearchDiagnosticProduct, platform: string, options: { now?: () => number; sink?: (event: Record<string, unknown>) => void } = {}) {
  const now = () => { try { return (options.now ?? (() => performance.now()))(); } catch { return 0; } };
  let startedAt = now();
  let trace = createSearchDiagnostics(product, undefined, "native", { ...options, platform, span: "presentation" });
  let firstViewable = false;
  let acceptedCount = 0;
  let acceptedRows = new WeakSet<object>();
  return {
    begin(requestId: string) { startedAt = now(); firstViewable = false; acceptedCount = 0; acceptedRows = new WeakSet(); trace = createSearchDiagnostics(product, requestId, "native", { ...options, platform, startedAt, span: "presentation" }); },
    accepted(requestId: string, canonicalCount: number, count: number, durationMs: number, rows: readonly object[]) {
      trace = createSearchDiagnostics(product, requestId, "native", { ...options, platform, startedAt, span: "presentation" });
      acceptedCount += count;
      for (const row of rows) acceptedRows.add(row);
      trace("validation", { count: canonicalCount, acceptedCount: count, rejectedCount: Math.max(0, canonicalCount - count), durationMs });
    },
    published(count: number, completed: boolean) { trace("state-publication", { count, completed }); if (completed) trace("final-inventory", { count, completed }); },
    onViewableItemsChanged({ viewableItems }: { viewableItems: Array<{ isViewable?: boolean; item: unknown }> }) {
      if (firstViewable || !acceptedCount) return;
      const count = viewableItems.filter(({ isViewable, item }) => isViewable && item !== null && typeof item === "object" && acceptedRows.has(item)).length;
      if (count) { firstViewable = true; trace("viewport-reported", { count }); }
    },
  };
}
