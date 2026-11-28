import { randomUUID } from "node:crypto";
import { encodeCohort } from "@/lib/search/cohortEncoding";
type EncodedCohort = Awaited<ReturnType<typeof encodeCohort>>;
/** Reuse bytes only when aliases identify the exact same complete inventory. */
export async function publishHotelCohortAliases<T>(
  results: T[], criteriaKey: string, snapshotKey: (row: T) => string | null,
  publish: (key: string, rows: T[], encoded: EncodedCohort) => Promise<void>,
  encode: (rows: T[]) => Promise<EncodedCohort> = rows => encodeCohort(rows, randomUUID()),
) {
  const snapshots = new Map<string, T[]>();
  for (const row of results) {
    const key = snapshotKey(row); if (!key) continue;
    const group = snapshots.get(key); if (group) group.push(row); else snapshots.set(key, [row]);
  }
  let complete: EncodedCohort | undefined;
  for (const [key, rows] of snapshots) {
    const encoded = await encode(rows);
    await publish(key, rows, encoded);
    if (rows.length === results.length) complete = encoded;
  }
  await publish(criteriaKey, results, complete ?? await encode(results));
}
