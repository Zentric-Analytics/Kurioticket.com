/** UTC-only expiration formatting for Team Access. API accepts ISO timestamps. */
export type UtcExpirationParts = { date: string; hour: string; minute: string };

const two = (n: number) => String(n).padStart(2, "0");

export function parseUtcExpiration(value: string | Date | null | undefined): UtcExpirationParts | null {
  if (!value) return null;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const iso = instant.toISOString();
  return { date: iso.slice(0, 10), hour: iso.slice(11, 13), minute: iso.slice(14, 16) };
}

export function composeUtcExpiration(date: string, hour: string, minute: string): string | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date) ||
      !/^[0-9]{1,2}$/.test(hour) || !/^[0-9]{1,2}$/.test(minute)) return null;
  const hours = Number(hour), minutes = Number(minute);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const timestamp = new Date(date + "T" + two(hours) + ":" + two(minutes) + ":00.000Z");
  if (Number.isNaN(timestamp.getTime())) return null;
  const iso = timestamp.toISOString();
  return iso.slice(0, 10) === date && iso.slice(11, 13) === two(hours) &&
    iso.slice(14, 16) === two(minutes) ? iso : null;
}

export function moveUtcMonth(month: string, offset: number): string {
  if (!/^[0-9]{4}-[0-9]{2}$/.test(month)) return "2026-01";
  const [year, oneBasedMonth] = month.split("-").map(Number);
  return new Date(Date.UTC(year, oneBasedMonth - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function utcMonthGrid(month: string): (string | null)[] {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const [year, oneBasedMonth] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, oneBasedMonth - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, oneBasedMonth, 0)).getUTCDate();
  const gridLength = Math.ceil((first + count) / 7) * 7;
  return Array.from({ length: gridLength }, (_, index) => {
    const day = index - first + 1;
    return day > 0 && day <= count ? month + "-" + two(day) : null;
  });
}

export function formatUtcExpiration(value: string | Date | null | undefined): string {
  const parsed = parseUtcExpiration(value);
  if (!parsed) return "No expiration";
  const date = new Date(parsed.date + "T00:00:00.000Z");
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  }).format(date) + " · " + parsed.hour + ":" + parsed.minute + " UTC";
}
