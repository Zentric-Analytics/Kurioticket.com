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
