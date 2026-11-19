import {
  displayMarketPrice,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";

export type HotelDisplayPriceSnapshot = {
  nightly: DisplayPrice | null;
  total: DisplayPrice | null;
};

export type HotelRoomDisplayPrice = {
  nightly: DisplayPrice;
  total: DisplayPrice;
};

/** Keeps room choices in the Hotel page's effective currency or marks them unavailable. */
export function createHotelRoomDisplayPrice(
  providerNightly: number,
  providerTotal: number,
  providerCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
): HotelRoomDisplayPrice | null {
  const nightly = displayMarketPrice(
    providerNightly,
    providerCurrency,
    displayCurrency,
    rates,
  );
  const total = displayMarketPrice(
    providerTotal,
    providerCurrency,
    displayCurrency,
    rates,
  );
  const effectiveCurrency = displayCurrency.trim().toUpperCase();
  if (
    nightly.currency !== effectiveCurrency ||
    total.currency !== effectiveCurrency
  ) {
    return null;
  }
  return { nightly, total };
}

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
