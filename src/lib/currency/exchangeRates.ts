export const exchangeRatesFromUsd: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 155,
  BRL: 5.1,
  INR: 83,
};

export function convertCurrency(amountUsd: number, targetCurrency: string) {
  const normalizedCurrency = targetCurrency.toUpperCase();
  const rate = normalizedCurrency === "USD"
    ? 1
    : exchangeRatesFromUsd[normalizedCurrency];
  if (rate === undefined) {
    return amountUsd;
  }
  return amountUsd * rate;
}

export function resolveDisplayCurrency(targetCurrency: string) {
  const normalizedCurrency = targetCurrency.toUpperCase();
  if (normalizedCurrency === "USD" || exchangeRatesFromUsd[normalizedCurrency] !== undefined) {
    return normalizedCurrency;
  }
  return "USD";
}
