import { supportedRegions } from "@/lib/region/supportedRegions";

export type MarketGroup =
  | "US"
  | "Canada"
  | "Africa"
  | "Europe"
  | "Middle East"
  | "Asia"
  | "Latin America"
  | "Global International";

export type MarketFallbackLevel =
  | "exact-country"
  | "regional"
  | "global"
  | "neutral";

export type MarketProfile = {
  countryCode: string;
  effectiveMarketCode: string;
  marketGroup: MarketGroup;
  fallbackLevel: MarketFallbackLevel;
  defaultCurrency?: string;
  primaryAirportCodes: string[];
  contentMarketCode: string;
  pricingMarketCode: string;
};

const SUPPORTED_REGION_BY_CODE = new Map(
  supportedRegions.map((region) => [region.code, region]),
);

const EXACT_MARKET_BY_COUNTRY: Record<string, string> = {
  US: "US",
  CA: "CANADA",
  NG: "NG",
  KE: "KE",
  ZA: "ZA",
  GB: "GB",
  DE: "DE",
  AE: "AE",
  JP: "JP",
  BR: "BR",
};

const PRIMARY_AIRPORTS_BY_MARKET: Record<string, string[]> = {
  US: ["JFK", "EWR", "LAX", "ORD", "ATL", "DFW"],
  CANADA: ["YYZ", "YVR", "YUL", "YYC"],
  NG: ["LOS", "ABV"],
  KE: ["NBO"],
  ZA: ["JNB", "CPT", "DUR"],
  GB: ["LHR", "LGW", "MAN", "EDI"],
  DE: ["FRA", "MUC", "BER"],
  AE: ["DXB", "AUH"],
  JP: ["NRT", "HND"],
  BR: ["GRU", "GIG"],
  AFRICA: ["LOS", "ACC", "NBO", "JNB", "CPT"],
  EUROPE: ["LHR", "CDG", "AMS", "FRA", "MUC", "MAD"],
  MIDDLE_EAST: ["DXB", "AUH", "DOH", "JED", "RUH"],
  ASIA: ["NRT", "HND", "SIN", "BKK", "ICN", "KUL"],
  LATIN_AMERICA: ["GRU", "GIG", "MEX", "BOG", "LIM"],
  GLOBAL: ["LHR", "DXB", "SIN", "GRU", "JFK"],
};

const AFRICA_COUNTRIES = new Set([
  "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV", "DJ",
  "DZ", "EG", "EH", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW", "KE",
  "KM", "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW", "MZ", "NA",
  "NE", "NG", "RE", "RW", "SC", "SD", "SH", "SL", "SN", "SO", "SS", "ST",
  "SZ", "TD", "TG", "TN", "TZ", "UG", "YT", "ZA", "ZM", "ZW",
]);

const EUROPE_COUNTRIES = new Set([
  "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CY", "CZ", "DE",
  "DK", "EE", "ES", "EU", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR",
  "HU", "IE", "IM", "IS", "IT", "JE", "LI", "LT", "LU", "LV", "MC", "MD",
  "ME", "MK", "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI",
  "SJ", "SK", "SM", "UA", "VA", "XK",
]);

const MIDDLE_EAST_COUNTRIES = new Set([
  "AE", "BH", "IL", "IQ", "IR", "JO", "KW", "LB", "OM", "PS", "QA", "SA",
  "SY", "TR", "YE",
]);

const ASIA_COUNTRIES = new Set([
  "AF", "AM", "AZ", "BD", "BN", "BT", "CC", "CN", "CX", "GE", "HK", "ID",
  "IN", "IO", "JP", "KG", "KH", "KP", "KR", "KZ", "LA", "LK", "MM", "MN",
  "MO", "MV", "MY", "NP", "PH", "PK", "SG", "TH", "TJ", "TL", "TM", "TW",
  "UZ", "VN",
]);

const LATIN_AMERICA_COUNTRIES = new Set([
  "AR", "BO", "BR", "BZ", "CL", "CO", "CR", "CU", "DO", "EC", "FK", "GF",
  "GS", "GT", "GY", "HN", "MX", "NI", "PA", "PE", "PY", "SR", "SV", "UY", "VE",
]);

const CANADA_COUNTRIES = new Set(["CA", "PM", "GL"]);

const marketConfigByGroup: Record<
  Exclude<MarketGroup, "US" | "Canada" | "Global International">,
  { code: string; countries: Set<string> }
> = {
  Africa: { code: "AFRICA", countries: AFRICA_COUNTRIES },
  Europe: { code: "EUROPE", countries: EUROPE_COUNTRIES },
  "Middle East": { code: "MIDDLE_EAST", countries: MIDDLE_EAST_COUNTRIES },
  Asia: { code: "ASIA", countries: ASIA_COUNTRIES },
  "Latin America": { code: "LATIN_AMERICA", countries: LATIN_AMERICA_COUNTRIES },
};

export const SUPPORTED_MARKET_COUNTRY_CODES = supportedRegions.map(
  (region) => region.code,
);

export const HOMEPAGE_REFRESH_MARKET_CODES = [
  "US",
  "CANADA",
  "NG",
  "KE",
  "ZA",
  "GB",
  "DE",
  "AE",
  "JP",
  "BR",
  "AFRICA",
  "EUROPE",
  "MIDDLE_EAST",
  "ASIA",
  "LATIN_AMERICA",
  "GLOBAL",
] as const;

export function resolveMarket(regionCode?: string | null): MarketProfile {
  const countryCode = normalizeMarketCountryCode(regionCode);
  const supportedRegion = SUPPORTED_REGION_BY_CODE.get(countryCode);
  const exactMarketCode = EXACT_MARKET_BY_COUNTRY[countryCode];

  if (exactMarketCode) {
    return buildMarketProfile({
      countryCode,
      marketCode: exactMarketCode,
      marketGroup: getMarketGroupForExactMarket(exactMarketCode),
      fallbackLevel: "exact-country",
      defaultCurrency: supportedRegion?.currency,
    });
  }

  if (CANADA_COUNTRIES.has(countryCode)) {
    return buildMarketProfile({
      countryCode,
      marketCode: "CANADA",
      marketGroup: "Canada",
      fallbackLevel: "regional",
      defaultCurrency: supportedRegion?.currency,
    });
  }

  for (const [marketGroup, config] of Object.entries(
    marketConfigByGroup,
  ) as Array<
    [
      Exclude<MarketGroup, "US" | "Canada" | "Global International">,
      { code: string; countries: Set<string> },
    ]
  >) {
    if (config.countries.has(countryCode)) {
      return buildMarketProfile({
        countryCode,
        marketCode: config.code,
        marketGroup,
        fallbackLevel: "regional",
        defaultCurrency: supportedRegion?.currency,
      });
    }
  }

  return buildMarketProfile({
    countryCode,
    marketCode: "GLOBAL",
    marketGroup: "Global International",
    fallbackLevel: supportedRegion ? "global" : "neutral",
    defaultCurrency: supportedRegion?.currency,
  });
}

export function normalizeMarketCountryCode(regionCode?: string | null) {
  const normalized = regionCode?.trim().toUpperCase();

  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : "GLOBAL";
}

function buildMarketProfile({
  countryCode,
  marketCode,
  marketGroup,
  fallbackLevel,
  defaultCurrency,
}: {
  countryCode: string;
  marketCode: string;
  marketGroup: MarketGroup;
  fallbackLevel: MarketFallbackLevel;
  defaultCurrency?: string;
}): MarketProfile {
  return {
    countryCode,
    effectiveMarketCode: marketCode,
    marketGroup,
    fallbackLevel,
    defaultCurrency,
    primaryAirportCodes:
      PRIMARY_AIRPORTS_BY_MARKET[marketCode] ?? PRIMARY_AIRPORTS_BY_MARKET.GLOBAL,
    contentMarketCode: marketCode,
    pricingMarketCode: marketCode,
  };
}

function getMarketGroupForExactMarket(marketCode: string): MarketGroup {
  if (marketCode === "US") return "US";
  if (marketCode === "CANADA") return "Canada";
  if (marketCode === "NG" || marketCode === "KE" || marketCode === "ZA") {
    return "Africa";
  }
  if (marketCode === "GB" || marketCode === "DE") return "Europe";
  if (marketCode === "AE") return "Middle East";
  if (marketCode === "JP") return "Asia";
  if (marketCode === "BR") return "Latin America";

  return "Global International";
}
