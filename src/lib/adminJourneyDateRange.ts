import { activityCustomDateBound, validActivityUtcInstant } from "./adminActivityDateQuery";
import { adminRollingRange } from "./adminReportingRanges";

/** UI-only date range selection for Admin Journeys.
 * The journey service still receives only its documented ISO UTC bounds.
 */
export type JourneyDateRange = "24h" | "today" | "7d" | "30d" | "all" | "90d" | "custom";

/** All retained history; the server still enforces authorization, timeouts and cursor limits. */
export const JOURNEY_ALL_TIME_FROM = "1970-01-01T00:00:00.000Z";
export type JourneyDateParams = Record<string, string | string[] | undefined>;

const dayMs = 86_400_000;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function selectedJourneyRange(raw: JourneyDateParams): JourneyDateRange {
  const range = one(raw.range);
  if (range === "24h" || range === "today" || range === "7d" || range === "30d" || range === "all" || range === "90d" || range === "custom") return range;
  // Older URLs and identity-activity drill-downs may contain only explicit
  // dates; they should not be silently reinterpreted as a 24-hour preset.
  return one(raw.from) || one(raw.to) || one(raw.cursor) ? "custom" : "today";
}

export function journeyWindow(raw: JourneyDateParams, now: Date, timeZone = "UTC"): { from?: string; to?: string } {
  const range = selectedJourneyRange(raw);
  const cursor = one(raw.cursor);
  const fromValue = one(raw.from);
  const toValue = one(raw.to);
  if (Array.isArray(raw.from) || Array.isArray(raw.to)) return {};
  if (range === "today") {
    const bounds = adminRollingRange(range, now, timeZone);
    const matchingCutoff = fromValue === bounds.from && validActivityUtcInstant(toValue)
      && toValue > bounds.from && toValue <= bounds.to;
    return { from: bounds.from, to: cursor ? undefined : matchingCutoff ? toValue : bounds.to };
  }
  if (range === "custom") {
    const from = fromValue && activityCustomDateBound(fromValue, "from", timeZone);
    const to = toValue && activityCustomDateBound(toValue, "to", timeZone, now);
    // A continuation already carries the fixed upper cutoff of a partial present day.
    const useCursorCutoff = cursor && to !== toValue && to === now.toISOString();
    return {
      ...(from ? { from } : {}),
      ...(to ? { to: useCursorCutoff ? undefined : to } : {}),
    };
  }
  // Preserve explicit investigation windows and the fixed scope of a continuation.
  if (cursor || fromValue || toValue) return {};
  const to = now.toISOString();
  const from = range === "all" ? JOURNEY_ALL_TIME_FROM
    : range === "90d" ? new Date(now.getTime() - 90 * dayMs).toISOString()
    : adminRollingRange(range, now, timeZone).from;
  return { from, to };
}
