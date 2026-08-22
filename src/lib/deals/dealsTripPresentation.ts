const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

const localeName = (locale: string) => locale.replace("_", "-");
const validParts = (parts: number[]) => parts.every(Number.isFinite);

export function formatDealsDate(value: string, locale: string, includeTime: boolean): string {
  const dateOnly = DATE_ONLY.exec(value);
  const wall = WALL_TIME.exec(value);
  let date: Date;
  let timeZone: "UTC" | undefined;
  if (dateOnly) {
    const parts = dateOnly.slice(1).map(Number); if (!validParts(parts)) return value;
    date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])); timeZone = "UTC";
  } else if (wall) {
    const parts = wall.slice(1).map(part => Number(part || 0)); if (!validParts(parts)) return value;
    date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5])); timeZone = "UTC";
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return value;
  try {
    const options: Intl.DateTimeFormatOptions = includeTime
      ? { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone }
      : { year: "numeric", month: "short", day: "numeric", timeZone };
    return new Intl.DateTimeFormat(localeName(locale), options).format(date);
  } catch { return value; }
}

function daysBetween(start: string, end: string): number | null {
  const a = DATE_ONLY.exec(start), b = DATE_ONLY.exec(end);
  if (!a || !b) return null;
  const difference = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3]);
  return difference > 0 ? Math.ceil(difference / 86_400_000) : null;
}

export const getDealsStayNights = daysBetween;
export const getDealsRentalDays = daysBetween;
export function titleCaseDealsLabel(value?: string) {
  if (!value || value !== value.toUpperCase() || !/[A-Z]/.test(value)) return value;
  return value.toLowerCase().replace(/(^|[\s/-])\p{L}/gu, letter => letter.toUpperCase());
}
