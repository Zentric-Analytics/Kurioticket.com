import type { CarResult } from "../../api/travelApi";
import { displayPrice, type ExchangeRates } from "../currency/displayCurrency";

type CarOffer = CarResult["offers"][number];

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
