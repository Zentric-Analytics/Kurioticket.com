export const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;

const ISO_COUNTRY_CODES = [
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
] as const;

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  bolivia: "BO",
  brunei: "BN",
  "cabo verde": "CV",
  "cape verde": "CV",
  congo: "CG",
  "congo brazzaville": "CG",
  "congo kinshasa": "CD",
  "cote divoire": "CI",
  "cote d ivoire": "CI",
  "czech republic": "CZ",
  "democratic republic of congo": "CD",
  "east timor": "TL",
  iran: "IR",
  laos: "LA",
  macau: "MO",
  moldova: "MD",
  palestine: "PS",
  russia: "RU",
  "south korea": "KR",
  "north korea": "KP",
  syria: "SY",
  taiwan: "TW",
  tanzania: "TZ",
  turkey: "TR",
  turkiye: "TR",
  "u s": "US",
  "u s a": "US",
  uk: "GB",
  "united states of america": "US",
  usa: "US",
  venezuela: "VE",
  vietnam: "VN",
};

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

const normalizeCountryNameKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

const COUNTRY_CODE_BY_NAME = ISO_COUNTRY_CODES.reduce<Record<string, string>>((countries, code) => {
  const displayName = countryDisplayNames.of(code);

  if (displayName) {
    countries[normalizeCountryNameKey(displayName)] = code;
  }

  return countries;
}, { ...COUNTRY_NAME_ALIASES });

export const normalizeCountryCode = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!COUNTRY_CODE_PATTERN.test(trimmed)) return undefined;
  return trimmed.toUpperCase();
};

export const countryNameToCountryCode = (value?: string | null) => {
  if (!value) return undefined;

  const countryCode = normalizeCountryCode(value);
  if (countryCode) return countryCode;

  return COUNTRY_CODE_BY_NAME[normalizeCountryNameKey(value)];
};

export const countryMatchesCode = (country: string | null | undefined, countryCode: string | null | undefined) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) return false;

  return countryNameToCountryCode(country) === normalizedCountryCode;
};

export const countryCodeToCountryName = (countryCode?: string | null) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!normalizedCountryCode) return undefined;

  return countryDisplayNames.of(normalizedCountryCode) || undefined;
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
