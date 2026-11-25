import { journeyWindow, selectedJourneyRange, type JourneyDateParams, type JourneyDateRange } from "./adminJourneyDateRange";
import { activityCursorWindow } from "./adminIdentityActivity";
import { matchesJourneyCalendarCutoff } from "./adminJourneyDateCursor";
import type { IdentityKind } from "./adminIdentityJourney";
import type { AdminJourneyEnvironment } from "@/services/adminJourneyContract";

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
  // A direct journey-history visit uses the same Today default as Activity.
  // All time remains an explicit selectable range with no data loss.
  const range = selectedJourneyRange(raw);
  if (raw.range !== undefined && !["today", "24h", "7d", "30d", "90d", "all", "custom"].includes(raw.range as string)) {
    return { ok: false };
  }
  if (range === "custom" && !raw.cursor && (!raw.from || !raw.to)) return { ok: false };

  const filters: Record<string, unknown> = {};
  for (const key of ["product", "provider", "stage", "from", "to", "cursor"] as const) {
    if (raw[key] !== undefined) filters[key] = raw[key];
  }
  const fixed = journeyWindow({ ...raw, range }, now, timeZone);
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
  for (const key of ["range", "product", "provider", "stage", "from", "to", "activityReturn"] as const) {
    const value = raw[key];
    if (typeof value === "string" && value && (key !== "activityReturn" || value.length <= 1000)) params.set(key, value);
  }
  if (cursor) params.set("cursor", cursor);
  return "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/journeys"
    + (params.size ? "?" + params.toString() : "");
}
