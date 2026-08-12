import {
  formatDisplayPrice,
  type DisplayPrice,
} from "@/lib/currency/formatCurrency";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import type { DealsFlightItineraryV2 } from "./dealsTripPlanV2";

export function deriveDealsOutboundDisplayPricesV2({
  choices,
  displayCurrency,
  rates,
  isFallbackRate,
}: {
  choices: DealsFlightItineraryV2[];
  displayCurrency: string;
  rates?: ExchangeRates;
  isFallbackRate: boolean;
}) {
  const prices = new Map<string, DisplayPrice>();

  for (const choice of choices) {
    if (choice.indicativeFromPrice === undefined || !choice.indicativeCurrency)
      continue;
    prices.set(
      choice.itineraryKey,
      formatDisplayPrice({
        amount: choice.indicativeFromPrice,
        sourceCurrency: choice.indicativeCurrency,
        displayCurrency,
        convertSourceEstimate: true,
        maximumFractionDigits: 0,
        rates,
        isFallbackRate,
      }),
    );
  }

  return prices;
}

export function getComparableDealsOutboundPriceV2(
  price: DisplayPrice | undefined,
  displayCurrency: string,
) {
  return price?.currency === displayCurrency.toUpperCase()
    ? price.amount
    : undefined;
}
