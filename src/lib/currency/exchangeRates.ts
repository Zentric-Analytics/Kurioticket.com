export const exchangeRatesFromUsd: Record<string, number> = {
  // Static display-only estimates from USD. These rates are intentionally
  // documented as approximate UI conversions and must be replaced with live FX
  // before Kurioticket guarantees exact payment or booking currency amounts.
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 155,
  BRL: 5.1,
  INR: 83,
  NGN: 1500,
  ZAR: 18.4,
  AED: 3.67,
  SAR: 3.75,
  EGP: 47.5,
  KES: 129,
  GHS: 14.8,
  MXN: 17.1,
  ARS: 920,
  CLP: 930,
  COP: 3900,
  PEN: 3.72,
  CNY: 7.24,
  HKD: 7.82,
  SGD: 1.35,
  MYR: 4.7,
  THB: 36.7,
  IDR: 16200,
  PHP: 58.2,
  KRW: 1370,
  TRY: 32.2,
  CHF: 0.9,
  SEK: 10.6,
  NOK: 10.7,
  DKK: 6.86,
  PLN: 3.95,
  CZK: 22.8,
  HUF: 358,
};

export function convertCurrency(amountUsd: number, targetCurrency: string) {
  const normalizedCurrency = targetCurrency.toUpperCase();
  const rate = exchangeRatesFromUsd[normalizedCurrency];

  if (rate === undefined) {
    return amountUsd;
  }

  return amountUsd * rate;
}

export function resolveDisplayCurrency(targetCurrency: string) {
  const normalizedCurrency = targetCurrency.toUpperCase();

  if (exchangeRatesFromUsd[normalizedCurrency] !== undefined) {
    return normalizedCurrency;
  }

  return "USD";
}

export function isSupportedDisplayCurrency(targetCurrency: string) {
  return exchangeRatesFromUsd[targetCurrency.toUpperCase()] !== undefined;
}
