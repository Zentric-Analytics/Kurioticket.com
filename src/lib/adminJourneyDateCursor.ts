import { decodeAdminJourneyCursor } from "@/services/adminJourneyContract";
import { isActivityCalendarValue } from "./adminActivityDateQuery";
import { journeyDetailCalendarWindow, journeyWindow, selectedJourneyRange, type JourneyDateParams } from "./adminJourneyDateRange";
import { adminLocalDate } from "./adminLocalTime";
import { activityCursorWindow } from "./adminIdentityActivity";

/** Date-only ranges that end today can keep the prior cursor's frozen cutoff. */
export function matchesJourneyCalendarCutoff(
  raw: JourneyDateParams, window: ReturnType<typeof journeyWindow>, end: string, now: Date, timeZone: string,
): boolean {
  return typeof raw.to === "string" && raw.to.length === 10 && window.to === now.toISOString()
    && Boolean(window.from && end > window.from && end <= window.to)
    && adminLocalDate(new Date(end), timeZone) === raw.to;
}

/** A changed calendar scope starts on page one. Other cursor validation stays with the reader. */
export function resetStaleJourneyDateCursor(raw: JourneyDateParams, now: Date, timeZone: string, journeyId?: string): JourneyDateParams {
  if (typeof raw.cursor !== "string" && typeof raw.activityCursor !== "string") return raw;
  const range = selectedJourneyRange(raw);
  if (range !== "today" && range !== "custom") return raw;
  const selection = { ...raw, cursor: undefined, activityCursor: undefined };
  const window = journeyId ? journeyDetailCalendarWindow(selection, now, timeZone) : journeyWindow(selection, now, timeZone);
  if (range === "today" && typeof raw.activityCursor === "string" && typeof raw.from === "string"
      && window.from && raw.from !== window.from) {
    const next = { ...raw };
    delete next.activityCursor;
    return next;
  }
  if (range === "custom" && typeof raw.activityCursor === "string"
      && isActivityCalendarValue(raw.from) && isActivityCalendarValue(raw.to)) {
    const prior = activityCursorWindow(raw.activityCursor);
    if (prior && (window.from !== prior.from
        || (window.to !== prior.to && !matchesJourneyCalendarCutoff(raw, window, prior.to, now, timeZone)))) {
      const next = { ...raw };
      delete next.activityCursor;
      return next;
    }
  }
  if (typeof raw.cursor !== "string") return raw;
  const cursor = decodeAdminJourneyCursor(raw.cursor);
  if (!cursor || cursor.kind !== (journeyId ? "detail" : "list") || cursor.journeyId !== journeyId) return raw;
  const fromChanged = (range === "today" || isActivityCalendarValue(raw.from)) && window.from !== cursor.scope.from;
  const samePartialDay = matchesJourneyCalendarCutoff(raw, window, cursor.scope.to, now, timeZone);
  const toChanged = range === "custom" && isActivityCalendarValue(raw.to)
    && !samePartialDay && window.to !== cursor.scope.to;
  if (!fromChanged && !toChanged) return raw;
  const next = { ...raw };
  delete next.cursor;
  return next;
}
