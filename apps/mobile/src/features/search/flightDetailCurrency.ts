import {
  convertAmount,
  formatCurrency,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";

export function canReuseFlightDetailFare({
  passedFare,
  providerAmount,
  providerCurrency,
  preferredCurrency,
}: {
  passedFare?: DisplayPrice | null;
  providerAmount: number;
  providerCurrency: string;
  preferredCurrency?: string | null;
}) {
  if (!passedFare
    || passedFare.providerAmount !== providerAmount
    || passedFare.providerCurrency !== providerCurrency.toUpperCase()) return false;

  const preferred = preferredCurrency?.trim().toUpperCase();
  return !preferred || preferred === passedFare.currency.toUpperCase();
}

/** Returns null rather than silently displaying the provider currency when FX is unavailable. */
export function createFlightDetailFare(
  providerAmount: number,
  providerCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates,
): DisplayPrice | null {
  const provider = providerCurrency.toUpperCase();
  const currency = displayCurrency.toUpperCase();
  const amount = convertAmount(providerAmount, provider, currency, rates);
  if (amount === null) return null;
  return {
    amount,
    currency,
    formatted: formatCurrency(amount, currency),
    providerAmount,
    providerCurrency: provider,
    converted: provider !== currency,
  };
}
