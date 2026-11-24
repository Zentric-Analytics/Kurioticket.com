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

/** UTC instants; Today starts at midnight UTC; 7/30 days and legacy 24h roll.
 * 'all' is unbounded only for readers that explicitly support historical reads.
 * Never pass it directly to a bounded telemetry reader. */
export function adminUtcTodayStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function adminRollingRange(range: "today" | "24h" | "7d" | "30d", now = new Date()) {
  const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720;
  return { from: (range === "today" ? adminUtcTodayStart(now) : new Date(now.getTime() - hours * 3_600_000)).toISOString(), to: now.toISOString() };
}
