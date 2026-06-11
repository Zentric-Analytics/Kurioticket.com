import { supportedLocales } from "@/lib/supportedLocales";

const fallbackDateFormatLocale = "en-US";

export function getDateFormatLocale(locale?: string | null) {
  const normalizedLocale = locale?.trim().toLowerCase();

  if (!normalizedLocale) {
    return fallbackDateFormatLocale;
  }

  const supportedLocale = supportedLocales.find(
    (option) =>
      option.code.toLowerCase() === normalizedLocale ||
      option.locale.toLowerCase() === normalizedLocale,
  );

  return supportedLocale?.locale ?? fallbackDateFormatLocale;
}

export function formatCalendarMonth(date: Date, locale?: string | null) {
  return new Intl.DateTimeFormat(getDateFormatLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(date: Date, locale?: string | null) {
  return new Intl.DateTimeFormat(getDateFormatLocale(locale), {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatFullDate(date: Date, locale?: string | null) {
  return new Intl.DateTimeFormat(getDateFormatLocale(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatShortWeekdays(locale?: string | null, weekStartsOn: 0 | 1 = 0) {
  const formatter = new Intl.DateTimeFormat(getDateFormatLocale(locale), {
    weekday: "short",
  });
  const sunday = new Date(2024, 0, 7);

  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = index + weekStartsOn;
    return formatter.format(
      new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + dayOffset),
    );
  });
}
