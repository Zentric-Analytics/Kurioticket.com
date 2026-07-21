import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

type ItineraryDateTimeOptions = {
  value: string | Date;
  locale?: string;
  timeZone?: string;
};

const ISO_LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

function getItineraryDate(value: string | Date) {
  if (value instanceof Date) return value;

  const match = value.match(ISO_LOCAL_DATE_TIME_PATTERN);
  if (match) {
    const [, year, month, day, hour, minute, second = "0"] = match;

    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ),
    );
  }

  return new Date(value);
}

export function formatItineraryTime({
  value,
  locale = "en-US",
  timeZone,
}: ItineraryDateTimeOptions) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone || (typeof value === "string" ? "UTC" : undefined),
  }).format(getItineraryDate(value));
}

export function formatItineraryShortDate({
  value,
  locale = "en-US",
  timeZone,
}: ItineraryDateTimeOptions) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: timeZone || (typeof value === "string" ? "UTC" : undefined),
  }).format(getItineraryDate(value));
}

export function getItineraryDateKey(value: string | Date, timeZone?: string) {
  if (typeof value === "string") {
    const match = value.match(ISO_LOCAL_DATE_TIME_PATTERN);
    if (match && !timeZone) return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(getItineraryDate(value));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function formatShortDate(value: string | Date, locale = "en-US") {
  return formatItineraryShortDate({ value, locale });
}

export function formatTime(value: string | Date, locale = "en-US") {
  return formatItineraryTime({ value, locale });
}

export function minutesToDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export function sanitizeAirportCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const parenMatch = trimmed.match(/\(([A-Za-z]{3})\)/);
  if (parenMatch) {
    return parenMatch[1].toUpperCase();
  }

  const standaloneMatch = trimmed.match(/\b([A-Z]{3})\b/);
  if (standaloneMatch) {
    return standaloneMatch[1];
  }

  return trimmed.slice(0, 3).toUpperCase();
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
