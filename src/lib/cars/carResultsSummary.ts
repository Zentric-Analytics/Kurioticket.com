type CarResultsScheduleSummaryInput = {
  pickupDate?: string;
  pickupTime?: string;
  dropoffDate?: string;
  dropoffTime?: string;
  locale?: string;
};

const parseCalendarDate = (value?: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
};

const parseWallClockTime = (value?: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
};

const safeLocale = (locale?: string) => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(locale ? [locale] : ["en-US"])[0] ?? "en-US";
  } catch {
    return "en-US";
  }
};

const formatEndpoint = (dateValue: string | undefined, timeValue: string | undefined, locale: string) => {
  const date = parseCalendarDate(dateValue);
  const time = parseWallClockTime(timeValue);
  if (!date && !time) return "";

  const instant = new Date(Date.UTC(
    date?.getUTCFullYear() ?? 2000,
    date?.getUTCMonth() ?? 0,
    date?.getUTCDate() ?? 1,
    time?.hour ?? 0,
    time?.minute ?? 0,
  ));

  if (locale.toLowerCase().startsWith("en")) {
    const dateParts = date
      ? new Intl.DateTimeFormat(locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).formatToParts(instant)
      : [];
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((candidate) => candidate.type === type)?.value ?? "";
    const formattedDate = date
      ? `${part("weekday").replace(/[.,]+$/, "")}. ${part("month")} ${part("day")}`
      : "";
    const formattedTime = time
      ? new Intl.DateTimeFormat(locale, {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        }).format(instant)
      : "";
    return formattedDate && formattedTime
      ? `${formattedDate} at ${formattedTime}`
      : formattedDate || formattedTime;
  }

  return new Intl.DateTimeFormat(locale, {
    ...(date ? { weekday: "short", month: "short", day: "numeric" } : {}),
    ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(instant);
};

export const formatCarResultsScheduleSummary = ({
  pickupDate,
  pickupTime,
  dropoffDate,
  dropoffTime,
  locale,
}: CarResultsScheduleSummaryInput) => {
  const resolvedLocale = safeLocale(locale);
  return [
    formatEndpoint(pickupDate, pickupTime, resolvedLocale),
    formatEndpoint(dropoffDate, dropoffTime, resolvedLocale),
  ].filter(Boolean).join(" – ");
};
