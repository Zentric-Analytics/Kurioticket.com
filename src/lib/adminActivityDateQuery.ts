import { adminTodayStart } from "./adminTimeZone";
/** Share the exact UTC window and legacy bookmark handling between the
 * compact Activity overview and the dedicated full Other Activity page.
 * Do not reinterpret existing explicit timestamp filters.
 */
export type RawActivityQuery = Record<string, string | string[] | undefined>;

export function normalizeUserActivityQuery(input: RawActivityQuery, now: Date, timeZone = "UTC"): RawActivityQuery {
  const raw = { ...input };
  const selected = typeof raw.range === "string" ? raw.range : "";
  const range = selected || "today";
  if (!raw.from && !raw.to && ["today", "24h", "7d", "30d"].includes(range)) {
    const days = range === "30d" ? 30 : range === "7d" ? 7 : 1;
    raw.from = range === "today"
      ? adminTodayStart(now, timeZone).toISOString()
      : new Date(now.getTime() - days * 86_400_000).toISOString();
    raw.to = now.toISOString();
    raw.range = range;
  }
  // Legacy tabs and cursors must not change the current Activity scope.
  if (raw.tab === "journeys") delete raw.tab;
  delete raw.cursor;
  delete raw.order;
  delete raw.sort;
  return raw;
}

export function safeActivityQueryParams(raw: RawActivityQuery): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ["tab", "range", "stage", "product", "from", "to", "q", "order", "directory"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= 1100 && !/[\u0000-\u001f\u007f]/.test(value)) result[key] = value;
  }
  return result;
}
