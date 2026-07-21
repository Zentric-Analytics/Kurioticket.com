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
  if (normalized === "sv" || normalized === "sv-se" || normalized.startsWith("sv-")) return "sv-SE";
  if (normalized === "pl" || normalized === "pl-pl" || normalized.startsWith("pl-")) return "pl-PL";
  if (normalized === "tr" || normalized === "tr-tr" || normalized.startsWith("tr-")) return "tr-TR";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja-JP";
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko-KR";
  if (normalized === "th" || normalized === "th-th" || normalized.startsWith("th-")) return "th-TH-u-ca-gregory";

  if (normalized === "vi" || normalized === "vi-vn" || normalized.startsWith("vi-")) return "vi-VN";

  if (normalized === "id" || normalized === "id-id" || normalized.startsWith("id-")) return "id-ID";
  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized.startsWith("zh-cn-") ||
    normalized === "zh-hans" ||
    normalized.startsWith("zh-hans-")
  ) return "zh-CN";

  return "en-US";
};

const capitalizeFrenchCalendarLabel = (value: string) =>
  value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);

export const formatFlightsWeekdays = (locale: string | null | undefined) => {
  const normalizedLocale = normalizeFlightsCalendarLocale(locale);
  if (normalizedLocale === "th-TH-u-ca-gregory") {
    return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  }
  if (normalizedLocale === "vi-VN") {
    return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  }

  return Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(normalizedLocale, { weekday: "short" }).format(new Date(2024, 0, 7 + day)),
  );
};

export const formatFlightsMonthHeading = (date: Date, locale: string | null | undefined) => {
  const normalizedLocale = normalizeFlightsCalendarLocale(locale);
  const formatted = new Intl.DateTimeFormat(normalizedLocale, {
    month: "long",
    year: "numeric",
  }).format(date);

  if (normalizedLocale === "fr-FR") return capitalizeFrenchCalendarLabel(formatted);
  if (normalizedLocale === "vi-VN") return formatted.replace(/^tháng/, "Tháng").replace(" năm ", " ");

  return formatted;
};

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
