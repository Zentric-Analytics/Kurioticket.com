/** UI-only date range selection for Admin Journeys.
 * The journey service still receives only its documented ISO UTC bounds.
 */
export type JourneyDateRange = "today" | "7d" | "30d" | "90d" | "custom";
export type JourneyDateParams = Record<string, string | string[] | undefined>;

const dayMs = 86_400_000;

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export function selectedJourneyRange(raw: JourneyDateParams): JourneyDateRange {
  const range = one(raw.range);
  if (range === "today" || range === "7d" || range === "30d" || range === "90d" || range === "custom") return range;
  // Older URLs and identity-activity drill-downs may contain only explicit
  // dates; they should never appear to be an editable seven-day preset.
  return one(raw.from) || one(raw.to) || one(raw.cursor) ? "custom" : "7d";
}

export function journeyWindow(raw: JourneyDateParams, now: Date): { from?: string; to?: string } {
  // Preserve either explicit bound and the signed scope in a pagination cursor.
  // A new preset submission excludes previous custom inputs entirely.
  if (one(raw.cursor) || one(raw.from) || one(raw.to)) return {};
  const range = selectedJourneyRange(raw);
  // A bare custom URL is displayed with the backend's default window and
  // editable fields; the actual form never submits custom without ISO bounds.
  if (range === "custom") return {};
  const to = now.toISOString();
  const from = range === "today"
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
    : new Date(now.getTime() - (range === "90d" ? 90 : range === "30d" ? 30 : 7) * dayMs).toISOString();
  return { from, to };
}

/** Render an ISO instant as a UTC datetime-local control, not browser-local time. */
export function utcDateTimeInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

/** Convert a UTC-labelled datetime-local control into the strict backend ISO format. */
export function utcDateTimeIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
  const date = new Date(value + ":00.000Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 16) !== value) return "";
  return date.toISOString();
}

export function offsetUtcDateTime(value: string, minutes: number): string {
  const iso = utcDateTimeIso(value);
  if (!iso) return "";
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString().slice(0, 16);
}
