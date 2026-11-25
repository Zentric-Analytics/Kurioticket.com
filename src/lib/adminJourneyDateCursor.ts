import { decodeAdminJourneyCursor } from "@/services/adminJourneyContract";
import { isActivityCalendarValue } from "./adminActivityDateQuery";
import { journeyWindow, selectedJourneyRange, type JourneyDateParams } from "./adminJourneyDateRange";
import { adminLocalDate } from "./adminLocalTime";

/** A changed calendar scope starts on page one. Other cursor validation stays with the reader. */
export function resetStaleJourneyDateCursor(raw: JourneyDateParams, now: Date, timeZone: string): JourneyDateParams {
  if (typeof raw.cursor !== "string" && typeof raw.activityCursor !== "string") return raw;
  const range = selectedJourneyRange(raw);
  if (range !== "today" && range !== "custom") return raw;
  const window = journeyWindow({ ...raw, cursor: undefined, activityCursor: undefined }, now, timeZone);
  if (range === "today" && typeof raw.activityCursor === "string" && typeof raw.from === "string"
      && window.from && raw.from !== window.from) {
    const next = { ...raw };
    delete next.activityCursor;
    return next;
  }
  if (typeof raw.cursor !== "string") return raw;
  const cursor = decodeAdminJourneyCursor(raw.cursor);
  if (!cursor || cursor.kind !== "list") return raw;
  const fromChanged = (range === "today" || isActivityCalendarValue(raw.from)) && window.from !== cursor.scope.from;
  const samePartialDay = typeof raw.to === "string" && raw.to.length === 10 && window.to === now.toISOString()
    && adminLocalDate(new Date(cursor.scope.to), timeZone) === raw.to;
  const toChanged = range === "custom" && isActivityCalendarValue(raw.to)
    && !samePartialDay && window.to !== cursor.scope.to;
  if (!fromChanged && !toChanged) return raw;
  const next = { ...raw };
  delete next.cursor;
  return next;
}
