import {
  convertAmount,
  currencyAccessibilityLabel,
  formatCurrency,
  type DisplayPrice,
  type ExchangeRates,
} from "../currency/displayCurrency";

export type FlightDetailFareReuseDecision =
  | "valid"
  | "missing fare"
  | "provider amount mismatch"
  | "provider currency mismatch"
  | "explicit preference mismatch";

export function flightDetailFareReuseDecision({
  passedFare,
  providerAmount,
  providerCurrency,
  preferredCurrency,
}: {
  passedFare?: DisplayPrice | null;
  providerAmount: number;
  providerCurrency: string;
  preferredCurrency?: string | null;
}): FlightDetailFareReuseDecision {
  if (!passedFare) return "missing fare";
  if (passedFare.providerAmount !== providerAmount) return "provider amount mismatch";
  if (passedFare.providerCurrency !== providerCurrency.toUpperCase()) return "provider currency mismatch";

  const preferred = preferredCurrency?.trim().toUpperCase();
  if (preferred && preferred !== passedFare.currency.toUpperCase()) return "explicit preference mismatch";
  return "valid";
}

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
  return flightDetailFareReuseDecision({
    passedFare,
    providerAmount,
    providerCurrency,
    preferredCurrency,
  }) === "valid";
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
    accessibilityLabel: currencyAccessibilityLabel(amount, currency),
    providerAmount,
    providerCurrency: provider,
    converted: provider !== currency,
  };
}
