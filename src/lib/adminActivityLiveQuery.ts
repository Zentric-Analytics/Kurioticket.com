import { normalizeUserActivityQuery, safeActivityQueryParams, type RawActivityQuery } from "./adminActivityDateQuery";
import { parseActivityFilters } from "./adminIdentityActivity";
import { adminRollingRange } from "./adminReportingRanges";

const liveRanges = new Set(["all", "today", "24h", "7d", "30d"]);

/** A newest-page preset is a live reporting period. A seek cursor always
 * retains the exact original window, including when the local day changes. */
export function normalizeLiveUserActivityQuery(input: RawActivityQuery, now: Date, timeZone: string): RawActivityQuery {
  const raw = normalizeUserActivityQuery(input, now, timeZone);
  if (typeof input.cursor === "string" && input.cursor) {
    if (typeof input.from === "string") raw.from = input.from;
    if (typeof input.to === "string") raw.to = input.to;
    return raw;
  }
  // Validate before replacing generated bounds; malformed bookmarks must not
  // silently broaden into a valid all-time query.
  if (!parseActivityFilters(raw, timeZone).ok) return raw;
  if (raw.range === "all") {
    delete raw.from;
    raw.to = now.toISOString();
  } else if (raw.range === "today" || raw.range === "24h" || raw.range === "7d" || raw.range === "30d") {
    Object.assign(raw, adminRollingRange(raw.range, now, timeZone));
  }
  return raw;
}

/** Generated cutoffs belong only to continuation links, never to the next
 * newest view, a changed category or the overview's return context. */
export function liveActivityQueryParams(raw: RawActivityQuery): Record<string, string> {
  const params = safeActivityQueryParams(raw);
  if (liveRanges.has(params.range)) { delete params.from; delete params.to; }
  return params;
}
