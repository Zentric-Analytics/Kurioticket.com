import type { ActivityRow } from "./adminIdentityJourney";

/** Merge independently authorized streams, retaining the existing newest-first
 * timestamp / prefixed-ID ordering. The caller fetches a full event page and
 * up to one extra access row; the next cursor must use the last visible row. */
export function mergeUnifiedActivityPage(events: ActivityRow[], access: ActivityRow[], hasMoreEvents: boolean, pageSize: number) {
  const rows = [...events, ...access].sort((a,b) => +b.at - +a.at || a.id.localeCompare(b.id));
  return { rows: rows.slice(0, pageSize), hasMore: rows.length > pageSize || hasMoreEvents };
}
