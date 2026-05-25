export const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;

export const normalizeCountryCode = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!COUNTRY_CODE_PATTERN.test(trimmed)) return undefined;
  return trimmed.toUpperCase();
};

export const localeToCountryCode = (value?: string | null) => {
  if (!value) return undefined;
  const locale = value.trim();
  if (!locale || locale.length > 32) return undefined;
  const parts = locale.replace("_", "-").split("-");
  const region = parts.length > 1 ? parts[parts.length - 1] : "";
  return normalizeCountryCode(region);
};

export const resolveCountryCode = (params: {
  explicitCountryCode?: string | null;
  headerCountryCodes?: Array<string | null | undefined>;
  locale?: string | null;
}) => {
  const explicit = normalizeCountryCode(params.explicitCountryCode);
  if (explicit) return explicit;

  for (const headerCode of params.headerCountryCodes || []) {
    const normalized = normalizeCountryCode(headerCode);
    if (normalized) return normalized;
  }

  return localeToCountryCode(params.locale);
};
