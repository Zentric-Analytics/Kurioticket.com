// Reporting boundaries are local to the viewer. Stored timestamps and query
// bounds continue to be UTC instants.
export const ADMIN_DEFAULT_TIME_ZONE = "UTC";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
const TIME_ZONE_PATTERN = /^[a-z][a-z0-9_.+-]*(?:\/[a-z0-9_.+-]+)*$/i;
const timeZoneIdentities = new Map<string, string>();
const wallClockFormatters = new Map<string, Intl.DateTimeFormat>();

export function normalizeAdminTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 80 || !TIME_ZONE_PATTERN.test(value)) return null;
  const key = value.toLowerCase();
  const cached = timeZoneIdentities.get(key);
  if (cached) return cached;
  try {
    // Intl also accepts bare UTC offsets. The pattern above admits only named zones.
    const timeZone = new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone;
    timeZoneIdentities.set(key, timeZone);
    return timeZone;
  } catch {
    return null;
  }
}

export { normalizeAdminTimeZone as validViewerTimeZone };

export function resolveAdminTimeZone(value: unknown): string {
  return normalizeAdminTimeZone(value) ?? ADMIN_DEFAULT_TIME_ZONE;
}

function wallClockFormatter(timeZone: string | undefined) {
  const zone = resolveAdminTimeZone(timeZone);
  let formatter = wallClockFormatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
      timeZone: zone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    wallClockFormatters.set(zone, formatter);
  }
  return formatter;
}

function wallClock(timestamp: number, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(timestamp);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
}

export function adminLocalDate(date: Date, timeZone?: string): string {
  return wallClock(date.getTime(), wallClockFormatter(timeZone)).slice(0, 10);
}

export function adminLocalDateTime(date: Date, timeZone?: string): string {
  return wallClock(date.getTime(), wallClockFormatter(timeZone)).slice(0, 16);
}

/** Displays an explicit instant in a date field without changing its query bound. */
export function adminCalendarDateField(value: string, timeZone?: string, upperExclusive = false): string {
  if (!value || DATE_PATTERN.test(value)) return value;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return "";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "";
  return adminLocalDate(new Date(timestamp - (upperExclusive ? 1 : 0)), timeZone);
}

function parseCalendarDate(value: string): number {
  if (!DATE_PATTERN.test(value) || value.startsWith("0000")) return NaN;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() : NaN;
}

export function shiftAdminCalendarDate(value: string, days: number): string | null {
  const date = new Date(parseCalendarDate(value) + days * DAY_MS);
  if (!Number.isInteger(days) || !Number.isFinite(date.getTime())) return null;
  const shifted = date.toISOString().split("T")[0];
  return DATE_PATTERN.test(shifted) && !shifted.startsWith("0000") ? shifted : null;
}

function matchingWallClockInstant(wallTime: number, formatter: Intl.DateTimeFormat) {
  // Offset samples on both sides capture both occurrences of a repeated time.
  const localAsUtc = (instant: number) =>
    Date.parse(wallClock(instant, formatter) + "Z") + ((instant % 1000 + 1000) % 1000);
  const samples = [wallTime - 36 * HOUR_MS, wallTime, wallTime + 36 * HOUR_MS];
  const candidates = samples.map(instant => wallTime - (localAsUtc(instant) - instant));
  return candidates.filter(instant => localAsUtc(instant) === wallTime).sort((a, b) => a - b)[0];
}

/** The first instant on a day, or after its skipped midnight. */
export function adminStartOfLocalDay(day: string, timeZone?: string): Date | null {
  const wallTime = parseCalendarDate(day);
  if (!Number.isFinite(wallTime)) return null;
  const formatter = wallClockFormatter(timeZone);
  const midnight = matchingWallClockInstant(wallTime, formatter);
  if (midnight !== undefined) return new Date(midnight);

  // A time-zone transition can move the clock past midnight, or skip a day.
  // In that case use the first instant at or after the requested calendar day.
  let low = wallTime - 36 * HOUR_MS;
  let high = wallTime + 36 * HOUR_MS;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (wallClock(middle, formatter).slice(0, 10) < day) low = middle;
    else high = middle;
  }
  return new Date(high);
}

/** Resolves a local clock time. Repeated times use the first occurrence. */
export function adminLocalDateTimeToDate(value: string, timeZone?: string): Date | null {
  if (DATE_PATTERN.test(value)) return adminStartOfLocalDay(value, timeZone);
  if (!LOCAL_DATE_TIME_PATTERN.test(value) || !Number.isFinite(parseCalendarDate(value.slice(0, 10)))) return null;
  const time = new Date(value + "Z");
  if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const instant = matchingWallClockInstant(time.getTime(), wallClockFormatter(timeZone));
  return instant === undefined ? null : new Date(instant);
}

/** An inclusive range of local calendar dates with an exclusive UTC end. */
export function adminCalendarRange(fromDay: string, toDay: string, timeZone?: string): { from: Date; to: Date } | null {
  const nextDay = shiftAdminCalendarDate(toDay, 1);
  if (!nextDay || fromDay > toDay) return null;
  const from = adminStartOfLocalDay(fromDay, timeZone);
  const to = adminStartOfLocalDay(nextDay, timeZone);
  return from && to && from < to ? { from, to } : null;
}

export function viewerTodayStart(now: Date, timeZone: string): string {
  return adminStartOfLocalDay(adminLocalDate(now, timeZone), timeZone)!.toISOString();
}

export function formatViewerTimestamp(value: string | Date, timeZone: string, reference?: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const zone = resolveAdminTimeZone(timeZone);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en", { ...options, timeZone: zone }).format(date);
  if (reference) {
    const ref = new Date(reference);
    if (Number.isFinite(ref.getTime()) && adminLocalDate(date, zone) === adminLocalDate(ref, zone)) {
      return "Today, " + format({ hour: "numeric", minute: "2-digit" });
    }
  }
  return format({ dateStyle: "medium", timeStyle: "short" });
}

export function formatAdminTimeZoneLabel(timeZone: string, now = new Date()): string {
  const zone = resolveAdminTimeZone(timeZone);
  if (zone === ADMIN_DEFAULT_TIME_ZONE) return zone;
  const zoneName = (locale: string, timeZoneName: "short" | "shortOffset") =>
    new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName })
      .formatToParts(now).find(part => part.type === "timeZoneName")!.value;
  const offset = "UTC" + (zoneName("en-US", "shortOffset").slice(3) || "+0");
  const locale = zone.startsWith("America/") ? "en-US" : "en-GB";
  const abbreviation = zone === "Africa/Lagos" ? "WAT" : zone === "Asia/Dubai" ? "GST" : zoneName(locale, "short");
  return /^GMT[+-]/.test(abbreviation) ? offset : `${abbreviation} (${offset})`;
}
