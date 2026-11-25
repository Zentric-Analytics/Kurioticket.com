import {
  ADMIN_DEFAULT_TIME_ZONE,
  adminCalendarRange,
  adminLocalDate,
  normalizeAdminTimeZone,
  shiftAdminCalendarDate,
  viewerTodayStart,
} from "./adminLocalTime";

const MAX_CUSTOM_REPORTING_DAYS = 90;
const DAY_MS = 86_400_000;

/** Consistent operator-facing vocabulary. Backend readers retain their own
 * authorization, date bounds, cursor and retention policies. */
export const ADMIN_REPORTING_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;

export type AdminReportingRange = (typeof ADMIN_REPORTING_RANGE_OPTIONS)[number]["value"] | "24h";
export const ADMIN_DEFAULT_REPORTING_RANGE: AdminReportingRange = "today";

export const ADMIN_REPORTING_RANGE_LABELS: Record<AdminReportingRange, string> = {
  today: "Today",
  "24h": "Last 24 hrs",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
  custom: "Custom range",
};

export function isAdminReportingRange(value: string): value is AdminReportingRange {
  return value === "24h" || ADMIN_REPORTING_RANGE_OPTIONS.some(option => option.value === value);
}

export function adminUtcTodayStart(now = new Date()): Date {
  return new Date(viewerTodayStart(now, ADMIN_DEFAULT_TIME_ZONE));
}

/** Today starts on the local calendar day. Other periods are elapsed hours. */
export function adminRollingRange(
  range: "today" | "24h" | "7d" | "30d",
  now = new Date(),
  timeZone = ADMIN_DEFAULT_TIME_ZONE,
) {
  const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720;
  const from = range === "today"
    ? viewerTodayStart(now, timeZone)
    : new Date(now.getTime() - hours * 3_600_000).toISOString();
  return { from, to: now.toISOString() };
}

export function validAdminCustomCalendarDates(fromDate: string, toDate: string, today: string, maxDays = MAX_CUSTOM_REPORTING_DAYS): boolean {
  const latestEnd = shiftAdminCalendarDate(fromDate, maxDays - 1);
  return !!latestEnd && shiftAdminCalendarDate(toDate, 0) !== null
    && fromDate <= toDate && toDate <= latestEnd && toDate <= today;
}

export function adminCustomDateRange(
  fromDate: string,
  toDate: string,
  now = new Date(),
  timeZone = ADMIN_DEFAULT_TIME_ZONE,
  maxDays = MAX_CUSTOM_REPORTING_DAYS,
): { from: Date; to: Date } | null {
  if (!validAdminCustomCalendarDates(fromDate, toDate, adminLocalDate(now, timeZone), maxDays)) return null;
  const range = adminCalendarRange(fromDate, toDate, timeZone);
  if (!range || range.from >= now) return null;
  return { from: range.from, to: range.to < now ? range.to : now };
}

/** The elapsed API cap also permits an Overview-selected civil range that
 * spans a clock change. The zone is supplied by the calling server component. */
export function adminReportingWindowExceedsLimit(from: Date, to: Date, now: Date, calendarTimeZone?: string): boolean {
  if (to.getTime() - from.getTime() <= MAX_CUSTOM_REPORTING_DAYS * DAY_MS) return false;
  const zone = normalizeAdminTimeZone(calendarTimeZone);
  if (!zone) return true;

  const firstDay = adminLocalDate(from, zone);
  const lastDay = adminLocalDate(new Date(to.getTime() - 1), zone);
  const bounds = adminCustomDateRange(firstDay, lastDay, now, zone);
  if (!bounds || bounds.from.getTime() !== from.getTime() || to > bounds.to) return true;
  return to.getTime() !== bounds.to.getTime() && lastDay !== adminLocalDate(now, zone);
}
