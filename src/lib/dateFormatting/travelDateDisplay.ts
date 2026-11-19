import { normalizeFlightsCalendarLocale } from "../flights/dateFormatting";

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseTravelCalendarDate(
  value: string | null | undefined,
): Date | null {
  const match = value?.match(ISO_CALENDAR_DATE);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function formatTravelDateDisplay(
  isoDate: string | null | undefined,
  locale: string | null | undefined,
): string | null {
  const date = parseTravelCalendarDate(isoDate);
  if (!date) return null;

  return new Intl.DateTimeFormat(normalizeFlightsCalendarLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTravelDateRangeDisplay(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
  locale: string | null | undefined,
): string | null {
  const start = formatTravelDateDisplay(startIso, locale);
  const end = formatTravelDateDisplay(endIso, locale);
  return start && end ? `${start} — ${end}` : null;
}
