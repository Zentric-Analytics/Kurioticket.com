/** Admin-facing calendar time uses the operator's IANA time zone.
 * Persist and query absolute instants in UTC. Never use the searcher's
 * geolocated country or a provider's market to choose an admin time zone. */
export const ADMIN_TIME_ZONE_COOKIE = "kurioticket_admin_tz";

export function safeAdminTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length > 80 || !/^[A-Za-z0-9_+\/-]+$/.test(value)) return "UTC";
  try {
    return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function adminCalendarDate(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeAdminTimeZone(timeZone), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return [part("year"), part("month"), part("day")].join("-");
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(item => item.type === type)?.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

/** Return the UTC instant that represents midnight on a calendar date in zone.
 * Iterative offset resolution handles DST boundaries without assuming 24h days.
 * A skipped midnight resolves to the earliest valid point in that local day. */
export function adminCalendarDayStart(day: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid admin calendar day");
  const [year, month, date] = day.split("-").map(Number);
  const target = Date.UTC(year, month - 1, date);
  if (new Date(target).toISOString().slice(0, 10) !== day) throw new Error("Invalid admin calendar day");
  const zone = safeAdminTimeZone(timeZone);
  let instant = target;
  for (let i = 0; i < 5; i += 1) {
    const offset = zonedParts(new Date(instant), zone) - instant;
    const candidate = target - offset;
    if (candidate === instant) break;
    instant = candidate;
  }
  return new Date(instant);
}

export function adminTodayStart(now: Date, timeZone: string) {
  return adminCalendarDayStart(adminCalendarDate(now, timeZone), timeZone);
}

export function adminCalendarNextDayStart(day: string, timeZone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
  return adminCalendarDayStart(next, timeZone);
}

export function adminDisplayDateTime(value: Date | string | number, timeZone: string, style: "datetime" | "date" | "time" | "relative" = "datetime", referenceNow = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const zone = safeAdminTimeZone(timeZone);
  const timeFormat = new Intl.DateTimeFormat("en", { timeZone: zone, hour: "numeric", minute: "2-digit" });
  if (style === "time") return timeFormat.format(date);
  if (style === "relative") {
    const sameDay = adminCalendarDate(date, zone) === adminCalendarDate(referenceNow, zone);
    if (sameDay) return "Today, " + timeFormat.format(date);
    return new Intl.DateTimeFormat("en", { timeZone: zone, month: "short", day: "numeric", year: "numeric" }).format(date) + ", " + timeFormat.format(date);
  }
  return new Intl.DateTimeFormat("en", style === "date"
    ? { timeZone: zone, dateStyle: "medium" }
    : { timeZone: zone, dateStyle: "medium", timeStyle: "short" }).format(date);
}
