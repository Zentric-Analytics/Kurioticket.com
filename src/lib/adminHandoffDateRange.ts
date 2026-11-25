import { adminHandoffCursorWindow } from "@/services/adminOperationalReadContract";
import { activityCustomDateBound, isActivityCalendarValue } from "./adminActivityDateQuery";
import { adminRollingRange } from "./adminReportingRanges";

/** UI-only range presets. Operational handoff reads still accept strict from/to ISO timestamps. */
export type HandoffDateRange = "24h" | "today" | "7d" | "30d" | "all" | "custom";
type Raw = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * Keep older investigation deep-links with explicit from/to as Custom.
 * For rolling 7/30-day pagination, preserve the server-materialized from
 * timestamp so that cursor validation sees the exact same query scope.
 */
export function resolveHandoffDateRange(raw: Raw, now = new Date(), timeZone = "UTC"): {
  range: HandoffDateRange;
  from: string | null;
  to: string | null;
} {
  const supplied = one(raw.range);
  const from = one(raw.from);
  const to = one(raw.to);
  const range: HandoffDateRange =
    supplied === "24h" || supplied === "today" || supplied === "7d" || supplied === "30d" || supplied === "all"
      ? supplied
      : from || to ? "custom" : "today";

  if (range === "all") return { range, from: null, to: null };
  if (range === "custom") return {
    range,
    from: activityCustomDateBound(from, "from", timeZone) || null,
    to: activityCustomDateBound(to, "to", timeZone) || null,
  };
  if (range === "today") return { range, from: adminRollingRange("today", now, timeZone).from, to: null };

  if (from) return { range, from, to: null };
  return { range, from: adminRollingRange(range, now, timeZone).from, to: null };
}

/** Include the UI preset in links but omit it from the strict backend query. */
export function withHandoffDateScope(raw: Raw, now = new Date(), timeZone = "UTC"): Raw {
  const { range, from, to } = resolveHandoffDateRange(raw, now, timeZone);
  const scoped: Raw = { ...raw, range };
  delete scoped.from;
  delete scoped.to;
  if (from) scoped.from = from;
  if (to) scoped.to = to;
  return scoped;
}

/** Begin at the first page when a viewer-local window changes. */
export function resetStaleHandoffDateCursor(raw: Raw, window: ReturnType<typeof resolveHandoffDateRange>): Raw {
  const calendar = window.range === "today"
    || (window.range === "custom" && (isActivityCalendarValue(raw.from) || isActivityCalendarValue(raw.to)));
  if (!calendar || typeof raw.cursor !== "string") return raw;
  const prior = adminHandoffCursorWindow(raw.cursor);
  if (!prior || (prior.from === window.from && prior.to === window.to)) return raw;
  const next = { ...raw };
  delete next.cursor;
  delete next.pageTrail;
  return next;
}
