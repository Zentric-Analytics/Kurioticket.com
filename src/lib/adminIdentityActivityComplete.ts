import type { ActivityCursor } from "./adminIdentityActivity";

/** Batch size limits one database read, never the total visible history. */
export const COMPLETE_ACTIVITY_BATCH_SIZE = 500;
export type ActivitySourcePrefix = "j" | "s" | "r" | "e";
export type ActivitySourceRow = { id: string; createdAt: Date };

/**
 * Read every authorized matching row before the Activity page is returned.
 * Callers keep all reads inside one snapshot and retain their source predicates.
 * No browser scrolling, page cursor or fixed total limit controls this loop.
 * A failed/non-advancing read rejects the whole result rather than truncating it.
 */
export async function readCompleteActivitySource<T extends ActivitySourceRow>(
  prefix: ActivitySourcePrefix,
  fetchBatch: (after: ActivityCursor | undefined, take: number) => Promise<T[]>,
): Promise<T[]> {
  const rows: T[] = [];
  const boundaries = new Set<string>();
  let after: ActivityCursor | undefined;
  for (;;) {
    const batch = await fetchBatch(after, COMPLETE_ACTIVITY_BATCH_SIZE);
    if (!batch.length) return rows;
    const last = batch[batch.length - 1];
    if (boundaries.has(last.id)) throw new Error("Activity source did not advance");
    boundaries.add(last.id);
    rows.push(...batch);
    if (batch.length < COMPLETE_ACTIVITY_BATCH_SIZE) return rows;
    after = { id: prefix + "-" + last.id, at: last.createdAt.toISOString() };
  }
}
