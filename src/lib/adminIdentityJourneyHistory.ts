import { journeyWindow, selectedJourneyRange, JOURNEY_ALL_TIME_FROM, type JourneyDateParams, type JourneyDateRange } from "./adminJourneyDateRange";
import { activityCursorWindow, parseActivityFilters } from "./adminIdentityActivity";
import { matchesJourneyCalendarCutoff, resetStaleJourneyDateCursor } from "./adminJourneyDateCursor";
import { validActivityUtcInstant } from "./adminActivityDateQuery";
import { decodeActivityJourneyReturn, encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import type { IdentityKind } from "./adminIdentityJourney";
import type { AdminJourneyEnvironment } from "@/services/adminJourneyContract";

function fixedContinuation(raw: JourneyDateParams): raw is JourneyDateParams & { from: string; to: string } {
  return Boolean((typeof raw.cursor === "string" && raw.cursor) || (typeof raw.activityCursor === "string" && raw.activityCursor))
    && typeof raw.from === "string" && typeof raw.to === "string"
    && validActivityUtcInstant(raw.from) && validActivityUtcInstant(raw.to) && raw.from < raw.to;
}

const presetRanges = new Set(["all", "today", "24h", "7d", "30d", "90d"]);
function newestPreset(raw: JourneyDateParams, cursor = raw.cursor) {
  return typeof raw.range === "string" && presetRanges.has(raw.range) && !cursor && !raw.activityCursor;
}

/** An explicit UTC continuation is a snapshot, including across midnight.
 * Calendar selections still use the existing changed-date/zone reset rules.
 * The readers independently validate every cursor's owner and full scope.
 */
export function resetStaleIdentityJourneyDateCursor(raw: JourneyDateParams, now: Date, timeZone: string) {
  return fixedContinuation(raw) ? raw : resetStaleJourneyDateCursor(raw, now, timeZone);
}

/**
 * One administrative journey reader scoped to the identity selected in Users.
 * URL filters may narrow the cohort but can never replace the selected owner
 * or switch the deployment environment.
 */
export function identityJourneyHistoryQuery(
  kind: IdentityKind,
  id: string,
  raw: JourneyDateParams,
  now: Date,
  environment: AdminJourneyEnvironment,
  timeZone = "UTC",
): { ok: true; range: JourneyDateRange; input: Record<string, unknown> } | { ok: false } {
  if (Object.values(raw).some(Array.isArray)) return { ok: false };
  // Direct dedicated-history visits keep their Today default. Activity entry
  // links carry their explicit selected range, including All time.
  const range = selectedJourneyRange(raw);
  if (raw.range !== undefined && !["today", "24h", "7d", "30d", "90d", "all", "custom"].includes(raw.range as string)) {
    return { ok: false };
  }
  if (range === "custom" && !raw.cursor && (!raw.from || !raw.to)) return { ok: false };
  const live = newestPreset(raw);
  // Materialized bounds on a preset are generated observations. Validate
  // before replacing them so malformed URLs cannot broaden into a valid view.
  if (live && !parseActivityFilters({ from: raw.from, to: raw.to }, timeZone).ok) return { ok: false };

  const filters: Record<string, unknown> = {};
  for (const key of ["product", "provider", "stage", "from", "to", "cursor"] as const) {
    if (raw[key] !== undefined) filters[key] = raw[key];
  }
  const fixed = fixedContinuation(raw) ? { from: raw.from, to: raw.to }
    : journeyWindow(live ? { range } : { ...raw, range }, now, timeZone);
  // All time never uses the reader's ordinary seven-day lower-bound fallback.
  if (range === "all" && !raw.from && !raw.cursor && !raw.activityCursor) fixed.from = JOURNEY_ALL_TIME_FROM;
  if (typeof raw.activityCursor === "string") {
    const prior = activityCursorWindow(raw.activityCursor);
    if (prior && fixed.from === prior.from && matchesJourneyCalendarCutoff(raw, fixed, prior.to, now, timeZone)) {
      fixed.to = prior.to;
    }
  }
  return {
    ok: true,
    range,
    input: {
      ...filters, ...fixed,
      // These fields are authoritative, never taken from URL query strings.
      environment, identity: kind === "user" ? "registered" : "guest",
      ...(kind === "user" ? { userId: id } : { visitorId: id }),
      limit: "25",
    },
  };
}

export function identityJourneyHistoryHref(
  kind: IdentityKind,
  id: string,
  raw: JourneyDateParams,
  cursor?: string,
): string {
  const params = new URLSearchParams();
  const position = cursor ?? raw.cursor;
  const live = newestPreset(raw, position);
  for (const key of ["range", "product", "provider", "stage", "from", "to"] as const) {
    if (live && (key === "from" || key === "to")) continue;
    const value = raw[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  const returnHref = decodeActivityJourneyReturn(raw.activityReturn);
  const returnToken = returnHref && encodeActivityJourneyReturn(returnHref);
  if (returnToken) params.set("activityReturn", returnToken);
  if (typeof position === "string" && position) params.set("cursor", position);
  if (typeof raw.activityCursor === "string" && raw.activityCursor) params.set("activityCursor", raw.activityCursor);
  return "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/journeys"
    + (params.size ? "?" + params.toString() : "");
}
