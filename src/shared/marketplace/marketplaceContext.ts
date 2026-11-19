import { supportedRegions } from "../../lib/region/supportedRegions";

export type MarketplaceSource = "USER" | "ACCOUNT" | "DETECTED" | "FALLBACK";

export type MarketplaceContext = {
  marketCountryCode: string;
  locale: string;
  displayCurrency: string;
  source: MarketplaceSource;
  hasExplicitMarket: boolean;
  hasExplicitCurrency: boolean;
};

export type MarketplaceContextInput = {
  locale: string;
  accountMarket?: string | null;
  selectedMarket?: string | null;
  detectedMarket?: string | null;
  explicitCurrency?: string | null;
  accountCurrency?: string | null;
};

const marketByCode = new Map(
  supportedRegions.map((region) => [region.code.toUpperCase(), region] as const),
);

export function resolveMarketplaceContext(input: MarketplaceContextInput): MarketplaceContext {
  const accountMarket = normalizeMarket(input.accountMarket);
  const selectedMarket = normalizeMarket(input.selectedMarket);
  const detectedMarket = normalizeMarket(input.detectedMarket);
  const marketCountryCode = accountMarket ?? selectedMarket ?? detectedMarket ?? "US";
  const explicitCurrency = normalizeCurrency(input.accountCurrency ?? input.explicitCurrency);
  const source: MarketplaceSource = accountMarket
    ? "ACCOUNT"
    : selectedMarket
      ? "USER"
      : detectedMarket
        ? "DETECTED"
        : "FALLBACK";

  return {
    marketCountryCode,
    locale: input.locale,
    displayCurrency:
      explicitCurrency ?? marketByCode.get(marketCountryCode)?.currency ?? "USD",
    source,
    hasExplicitMarket: Boolean(accountMarket ?? selectedMarket),
    hasExplicitCurrency: Boolean(explicitCurrency),
  };
}

export function normalizeMarketplaceCountry(value: string | null | undefined) {
  return normalizeMarket(value);
}

function normalizeMarket(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && marketByCode.has(normalized) ? normalized : null;
}

function normalizeCurrency(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}
