export const normalizeHotelCalendarLocale = (locale: string | null | undefined) => {
  const normalized = locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (normalized === "ar" || normalized.startsWith("ar-")) {
    return "ar";
  }

  if (normalized === "hi" || normalized.startsWith("hi-")) {
    return "hi-IN";
  }

  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized.startsWith("zh-cn-") ||
    normalized === "zh-hans" ||
    normalized.startsWith("zh-hans-")
  ) {
    return "zh-CN";
  }

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr-FR";
  }

  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es-ES";
  }

  if (normalized === "de" || normalized.startsWith("de-")) {
    return "de-DE";
  }

  if (normalized === "it" || normalized.startsWith("it-")) {
    return "it-IT";
  }

  if (normalized === "nl" || normalized.startsWith("nl-")) {
    return "nl-NL";
  }

  if (normalized === "pt" || normalized.startsWith("pt-")) {
    return "pt-BR";
  }

  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja-JP";
  }

  if (normalized === "ko" || normalized.startsWith("ko-")) {
    return "ko-KR";
  }

  if (normalized === "th" || normalized === "th-th" || normalized.startsWith("th-")) return "th-TH-u-ca-gregory";

  if (normalized === "vi" || normalized === "vi-vn" || normalized.startsWith("vi-")) return "vi-VN";

  if (normalized === "id" || normalized === "id-id" || normalized.startsWith("id-")) {
    return "id-ID";
  }

  if (normalized === "sv" || normalized === "sv-se" || normalized.startsWith("sv-")) return "sv-SE";
  if (normalized === "pl" || normalized === "pl-pl" || normalized.startsWith("pl-")) return "pl-PL";
  if (normalized === "tr" || normalized.startsWith("tr-")) {
    return "tr-TR";
  }

  return "en-US";
};

const parseHotelCalendarDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
};

/** Formats canonical Hotel calendar dates without device-timezone shifts. */
export function formatCompactHotelDateRange(
  startIso: string,
  endIso: string,
  locale: string,
): string | null {
  const start = parseHotelCalendarDate(startIso);
  const end = parseHotelCalendarDate(endIso);
  if (!start || !end || end.getTime() < start.getTime()) return null;

  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (start.getTime() === end.getTime()) return formatter.format(start);

  if (typeof formatter.formatToParts !== "function") {
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  const startParts = formatter.formatToParts(start);
  const endParts = formatter.formatToParts(end);
  const startDay = startParts.find((part) => part.type === "day")?.value;
  const endDay = endParts.find((part) => part.type === "day")?.value;
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();
  let formatted: string;

  if (sameMonth && startDay && endDay) {
    formatted = startParts
      .map((part) =>
        part.type === "day" ? `${startDay} – ${endDay}` : part.value,
      )
      .join("");
  } else if (sameYear) {
    const monthDayFormatter = new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const startMonthDay = monthDayFormatter.format(start);
    const endMonthDay = monthDayFormatter.format(end);
    const yearIndex = startParts.findIndex((part) => part.type === "year");
    const dateFieldIndexes = startParts
      .map((part, index) =>
        part.type === "month" || part.type === "day" ? index : -1,
      )
      .filter((index) => index >= 0);
    const yearComesFirst =
      yearIndex >= 0 && yearIndex < Math.min(...dateFieldIndexes);

    formatted = yearComesFirst
      ? `${formatter.format(start)} – ${endMonthDay}`
      : `${startMonthDay} – ${formatter.format(end)}`;
  } else {
    formatted = `${formatter.format(start)} – ${formatter.format(end)}`;
  }

  return formatted.replace(/\s*–\s*/g, " – ");
}
