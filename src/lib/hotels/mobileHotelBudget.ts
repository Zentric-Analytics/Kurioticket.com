import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";

// Filtering stays in USD; only the editable mobile budget uses display currency.
export function createMobileHotelBudget(currency: string, rates: ExchangeRates) {
  const rate = convertCurrencyAmount(1, "USD", currency, rates);
  const resolvedCurrency = rate !== null && rate > 0 ? currency : "USD";
  const multiplier = rate !== null && rate > 0 ? rate : 1;
  return {
    currency: resolvedCurrency,
    toDisplay: (usd: number) => Math.round(usd * multiplier * 100) / 100,
    toUsd: (amount: number) => Math.max(0, Number.isFinite(amount) ? Math.round(amount / multiplier * 1e8) / 1e8 : 0),
  };
}
