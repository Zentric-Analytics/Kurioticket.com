import { adminLocalDateTime, adminLocalDateTimeToDate, shiftAdminCalendarDate } from "./adminLocalTime";
import { adminRollingRange, isAdminReportingRange, type AdminReportingRange } from "./adminReportingRanges";

/** Presentation-only queue date-range selection. Backend receives only ISO from/to. */
export type AdminQueueRange = AdminReportingRange;
export { ADMIN_REPORTING_RANGE_OPTIONS as adminQueueRangeOptions, isAdminReportingRange as isAdminQueueRange } from "./adminReportingRanges";

export type AdminQueueWindow = { range: AdminQueueRange; from: string; to: string };

function queueCalendarBound(value: string, timeZone: string, upper = false) {
  const localValue = upper && /^\d{4}-\d{2}-\d{2}$/.test(value) ? shiftAdminCalendarDate(value, 1) : value;
  return localValue ? adminLocalDateTimeToDate(localValue, timeZone) : null;
}

/** A missing range means local Today to now, or custom for legacy dated URLs. */
export function resolveAdminQueueWindow(
  raw: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
  timeZone = "UTC",
): AdminQueueWindow {
  const range: AdminQueueRange = raw.range && isAdminReportingRange(raw.range)
    ? raw.range
    : raw.from || raw.to ? "custom" : "today";
  if (range === "all") return { range, from: "", to: "" };
  if (range === "custom") {
    const { from = "", to = "" } = raw;
    return {
      range,
      from: queueCalendarBound(from, timeZone)?.toISOString() ?? from,
      to: queueCalendarBound(to, timeZone, true)?.toISOString() ?? to,
    };
  }
  if (range === "today") {
    const current = adminRollingRange(range, now, timeZone);
    const { from } = current;
    const anchor = raw.to ? Date.parse(raw.to) : Number.NaN;
    // A Today link from another zone or day must use the current local midnight.
    const to = raw.from === from && anchor > Date.parse(from) && anchor <= now.getTime()
      && new Date(anchor).toISOString() === raw.to
      ? raw.to
      : current.to;
    return { range, from, to };
  }
  // Reuse the exact applied interval across pagination and status-tab navigation.
  if (raw.from && raw.to) return { range, from: raw.from, to: raw.to };
  return { range, ...adminRollingRange(range, now, timeZone) };
}

export function toAdminQueueDateParams(window: AdminQueueWindow): URLSearchParams {
  const params = new URLSearchParams({ range: window.range });
  if (window.from) params.set("from", window.from);
  if (window.to) params.set("to", window.to);
  return params;
}

/** Reporting-zone datetime inputs may be cleared or fall in a daylight-saving gap. */
export function validateCustomQueueWindow(from: string, to: string, timeZone = "UTC"): string | null {
  if (!from || !to) return "Choose both start and end dates.";
  const start = queueCalendarBound(from, timeZone);
  const end = queueCalendarBound(to, timeZone, true);
  if (!start || !end) return "Enter valid dates.";
  if (start >= end) return "Start must be earlier than end.";
  return null;
}

/** Render an explicit UTC instant in the selected reporting zone for editing. */
export function localQueueDateTime(iso: string, timeZone = "UTC"): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  return adminLocalDateTime(new Date(iso), timeZone);
}
