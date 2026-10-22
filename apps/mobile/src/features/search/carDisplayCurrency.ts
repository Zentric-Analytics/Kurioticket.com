import { displayPrice, type ExchangeRates } from "../currency/displayCurrency";
import { getPrimaryCarOffer } from "../../../../../src/lib/cars/carResults";
import type { CarOffer, NormalizedCarResult } from "../../../../../src/lib/cars/types";

/**
 * Build a presentation-only copy of a provider offer in the selected app currency.
 * Provider-owned values remain untouched so saved/search/detail identity stays canonical.
 */
export function presentCarOfferCurrency(
  offer: CarOffer,
  displayCurrency: string,
  rates: ExchangeRates,
): CarOffer {
  const targetCurrency = displayCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(targetCurrency)) return offer;

  const total = displayPrice(offer.totalPrice, offer.currency, targetCurrency, rates);
  const perDay = displayPrice(offer.pricePerDay, offer.currency, targetCurrency, rates);

  if (!total.converted || !perDay.converted || total.currency !== perDay.currency) return offer;

  return {
    ...offer,
    currency: total.currency,
    totalPrice: total.amount,
    pricePerDay: perDay.amount,
  };
}

/** Resolve the exact normalized daily amount rendered by a Cars result card. */
export function carDisplayPricePerDay(
  car: NormalizedCarResult,
  displayCurrency: string,
  rates: ExchangeRates,
) {
  const primaryOffer = getPrimaryCarOffer(car);
  if (!primaryOffer) return undefined;
  const price = presentCarOfferCurrency(primaryOffer, displayCurrency, rates).pricePerDay;
  return Number.isFinite(price) && price >= 0 ? price : undefined;
}
