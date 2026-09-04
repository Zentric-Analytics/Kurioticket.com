import {
  displayMarketPrice,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";

export type HotelDisplayPriceSnapshot = {
  nightly: DisplayPrice | null;
  total: DisplayPrice | null;
};

export function canReuseHotelDisplayPrices({
  snapshot, providerNightly, providerTotal, providerCurrency, displayCurrency, preferredCurrency,
}: {
  snapshot?: HotelDisplayPriceSnapshot | null;
  providerNightly: number;
  providerTotal: number;
  providerCurrency: string;
  displayCurrency?: string | null;
  preferredCurrency?: string | null;
}) {
  const provider = providerCurrency.toUpperCase();
  const preferred = preferredCurrency?.trim().toUpperCase();
  return Boolean(snapshot?.nightly && snapshot.total
    && snapshot.nightly.providerAmount === providerNightly
    && snapshot.total.providerAmount === providerTotal
    && snapshot.nightly.providerCurrency === provider
    && snapshot.total.providerCurrency === provider
    && snapshot.nightly.currency === snapshot.total.currency
    && (!displayCurrency || snapshot.nightly.currency === displayCurrency.toUpperCase())
    && (!preferred || snapshot.nightly.currency === preferred));
}

export function createHotelDisplayPrices(
  providerNightly: number,
  providerTotal: number,
  providerCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
): HotelDisplayPriceSnapshot {
  return {
    nightly: displayMarketPrice(providerNightly, providerCurrency, displayCurrency, rates),
    total: displayMarketPrice(providerTotal, providerCurrency, displayCurrency, rates),
  };
}
