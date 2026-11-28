import { adminRollingRange, validAdminCustomCalendarDates } from "./adminReportingRanges";
import { adminLocalDate, adminLocalDateTimeToDate, adminStartOfLocalDay, shiftAdminCalendarDate } from "./adminLocalTime";

export type RawActivityQuery = Record<string, string | string[] | undefined>;

const activityDay = /^\d{4}-\d{2}-\d{2}$/;

export function isActivityCalendarValue(value: string | string[] | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value);
}

export function validActivityUtcInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const at = new Date(value);
  return Number.isFinite(at.getTime()) && at.toISOString() === value;
}

/** Check the original civil dates before converting the query to UTC instants. */
export function activityCalendarRangeIssue({ from, to }: RawActivityQuery, now: Date, timeZone: string) {
  if (typeof from !== "string" || typeof to !== "string" || !activityDay.test(from) || !activityDay.test(to)) return null;
  return validAdminCustomCalendarDates(from, to, adminLocalDate(now, timeZone))
    ? null : { field: "to", message: "Choose a date range of up to 90 days, ending no later than today." };
}

/** Date-only filters use local calendar days. Timestamp bookmarks keep their instant. */
export function activityCustomDateBound(value: string, edge: "from" | "to", timeZone: string, now?: Date): string {
  if (!activityDay.test(value)) {
    return adminLocalDateTimeToDate(value, timeZone)?.toISOString() ?? value;
  }
  const day = edge === "to" ? shiftAdminCalendarDate(value, 1) : value;
  const bound = day && adminStartOfLocalDay(day, timeZone);
  if (!bound) return value;
  return edge === "to" && now && bound > now ? now.toISOString() : bound.toISOString();
}

export function displayActivityCalendarDate(value: string, timeZone: string, end = false) {
  if (!value || value.length === 10) return value;
  const at = Date.parse(value);
  return Number.isFinite(at) ? adminLocalDate(new Date(at - (end ? 1 : 0)), timeZone) : "";
}

/** Resolve calendar ranges before querying and preserve legacy absolute bookmarks. */
export function normalizeUserActivityQuery(input: RawActivityQuery, now: Date, timeZone = "UTC"): RawActivityQuery {
  const raw = { ...input };
  const selected = typeof raw.range === "string" ? raw.range : "";
  // A fresh identity view shares the directory's Today default. Explicit
  // dates and All time bookmarks remain the administrator's chosen scope.
  if (!Array.isArray(raw.range) && !selected) raw.range = raw.from || raw.to ? "custom" : "today";
  const range = typeof raw.range === "string" ? raw.range : "";
  const materializedToday = selected === "today" && [raw.from, raw.to].every(
    value => typeof value === "string" && validActivityUtcInstant(value),
  ) && String(raw.from) < String(raw.to);
  if (!Array.isArray(raw.range) && (materializedToday || (!raw.from && !raw.to))
      && (range === "today" || range === "24h" || range === "7d" || range === "30d")) {
    const window = adminRollingRange(range, now, timeZone);
    if (raw.from !== window.from || !raw.to) raw.to = window.to;
    raw.from = window.from;
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
  for (const key of ["tab", "range", "stage", "product", "interface", "from", "to", "q", "order", "directory", "usersReturn"]) {
    const value = raw[key];
    if (typeof value === "string" && value.length <= (key === "usersReturn" ? 2048 : 1100) && !/[\u0000-\u001f\u007f]/.test(value)) result[key] = value;
  }
  return result;
}
