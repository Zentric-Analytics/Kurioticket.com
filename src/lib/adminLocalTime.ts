/** Display-only timestamp and viewer-local reporting boundaries.
 * Search records remain UTC instants in storage and APIs. */
export function validViewerTimeZone(value: string | undefined): string | null {
  if (!value || value.length > 80) return null;
  try { return new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions().timeZone; }
  catch { return null; }
}

export function formatViewerTimestamp(value: string | Date, timeZone: string, reference?: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en", { ...options, timeZone }).format(date);
  if (reference) {
    const ref = new Date(reference);
    if (Number.isFinite(ref.getTime())) {
      const day = (at: Date) => new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      }).format(at);
      if (day(date) === day(ref)) return "Today, " + format({ hour: "numeric", minute: "2-digit" });
    }
  }
  return format({ dateStyle: "medium", timeStyle: "short" });
}

/** UTC instant corresponding to midnight on the viewer's local calendar day. */
export function viewerTodayStart(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const number = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const y = number("year"), m = number("month"), d = number("day");
  if (![y,m,d].every(Number.isFinite)) throw new Error("Invalid local calendar date");
  const midnightAsUtc = Date.UTC(y, m - 1, d);
  let guess = midnightAsUtc;
  for (let i = 0; i < 3; i++) {
    const local = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const n = (type: string) => Number(local.find(p => p.type === type)?.value);
    const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
    guess -= asUtc - midnightAsUtc;
  }
  return new Date(guess).toISOString();
}
