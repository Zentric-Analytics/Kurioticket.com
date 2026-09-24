export const FLIGHT_RESULT_INITIAL_RENDER_FLOOR = 10;
export const FLIGHT_RESULT_SCROLL_EXTENT_WARMUP_CAP = 30;
export const FLIGHT_RESULT_RENDER_BATCH_FLOOR = 10;
export const FLIGHT_RESULT_WINDOW_SIZE = 21;
export const FLIGHT_RESULT_BATCHING_PERIOD_MS = 16;

/**
 * React Native 0.81 estimates the unmeasured tail of a virtualized list from
 * the rows it has already laid out. Warm enough rows to make the native iOS
 * scroll indicator proportional from the first traversal, while keeping a
 * hard cap so large inventories remain virtualized.
 *
 * The Flight Results SectionList prepends one intro row before the result
 * cards, so the warm-up count includes that extra row.
 */
export function flightResultInitialRenderCount(resultCount: number): number {
  const normalizedCount = Number.isFinite(resultCount)
    ? Math.max(0, Math.trunc(resultCount))
    : 0;
  return Math.max(
    FLIGHT_RESULT_INITIAL_RENDER_FLOOR,
    Math.min(normalizedCount + 1, FLIGHT_RESULT_SCROLL_EXTENT_WARMUP_CAP),
  );
}

export function flightResultRenderBatchSize(resultCount: number): number {
  return Math.max(
    FLIGHT_RESULT_RENDER_BATCH_FLOOR,
    flightResultInitialRenderCount(resultCount),
  );
}
