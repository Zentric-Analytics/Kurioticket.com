export const normalizeFlightsCalendarLocale = (locale: string | null | undefined) => {
  const normalized = locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (normalized === "fr" || normalized.startsWith("fr-")) return "fr-FR";
  if (normalized === "es" || normalized.startsWith("es-")) return "es-ES";
  if (normalized === "de" || normalized.startsWith("de-")) return "de-DE";
  if (normalized === "it" || normalized.startsWith("it-")) return "it-IT";
  if (normalized === "nl" || normalized.startsWith("nl-")) return "nl-NL";
  if (normalized === "pt" || normalized === "pt-br" || normalized.startsWith("pt-")) return "pt-BR";
  if (normalized === "ar" || normalized.startsWith("ar-")) return "ar";
  if (normalized === "hi" || normalized === "hi-in" || normalized.startsWith("hi-")) return "hi-IN";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja-JP";
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko-KR";
  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized.startsWith("zh-cn-") ||
    normalized === "zh-hans" ||
    normalized.startsWith("zh-hans-")
  ) return "zh-CN";

  return "en-US";
};

export const formatFlightsWeekdays = (locale: string) =>
  Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 7 + day)),
  );

export const formatFlightsMonthHeading = (date: Date, locale: string | null | undefined) =>
  new Intl.DateTimeFormat(normalizeFlightsCalendarLocale(locale), {
    month: "long",
    year: "numeric",
  }).format(date);

export const formatFlightsDateSummary = (
  departureDate: Date,
  returnDate: Date | null,
  locale: string | null | undefined,
) => {
  const formatter = new Intl.DateTimeFormat(normalizeFlightsCalendarLocale(locale), {
    month: "short",
    day: "numeric",
  });
  const departureSummary = formatter.format(departureDate);

  return returnDate ? `${departureSummary} — ${formatter.format(returnDate)}` : departureSummary;
};
