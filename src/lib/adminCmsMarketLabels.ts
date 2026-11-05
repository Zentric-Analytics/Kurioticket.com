import type { HOMEPAGE_REFRESH_MARKET_CODES } from "@/lib/market/resolveMarket";

type CmsMarketCode = (typeof HOMEPAGE_REFRESH_MARKET_CODES)[number];

const marketNames: Record<CmsMarketCode, string> = {
  US: "United States",
  CANADA: "Canada",
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  GB: "United Kingdom",
  DE: "Germany",
  AE: "United Arab Emirates",
  JP: "Japan",
  BR: "Brazil",
  AFRICA: "Africa",
  EUROPE: "Europe",
  MIDDLE_EAST: "Middle East",
  ASIA: "Asia",
  LATIN_AMERICA: "Latin America",
  GLOBAL: "Global",
};

export function getCmsMarketName(code: string): string {
  return Object.hasOwn(marketNames, code) ? marketNames[code as CmsMarketCode] : code;
}
