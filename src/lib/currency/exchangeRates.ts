export const FX_BASE_CURRENCY = "USD";

// Emergency fallback-only display estimates from USD. These approximate rates are
// not the production source of truth, real-time FX quotes, or provider checkout
// price guarantees. Normal currency display should use /api/currency/rates.
export const fallbackExchangeRatesFromUsd: Record<string, number> = {
  AED: 3.67,
  AFN: 70,
  ALL: 92,
  AMD: 388,
  ANG: 1.79,
  AOA: 912,
  ARS: 920,
  AUD: 1.52,
  AWG: 1.79,
  AZN: 1.7,
  BAM: 1.8,
  BBD: 2,
  BDT: 117,
  BGN: 1.8,
  BHD: 0.376,
  BIF: 2870,
  BMD: 1,
  BND: 1.35,
  BOB: 6.91,
  BRL: 5.1,
  BSD: 1,
  BTN: 83,
  BWP: 13.5,
  BYN: 3.27,
  BZD: 2,
  CAD: 1.36,
  CDF: 2850,
  CHF: 0.9,
  CLP: 930,
  CNY: 7.24,
  COP: 3900,
  CRC: 520,
  CUP: 24,
  CVE: 101,
  CZK: 22.8,
  DJF: 178,
  DKK: 6.86,
  DOP: 59,
  DZD: 134,
  EGP: 47.5,
  ERN: 15,
  ETB: 57,
  EUR: 0.92,
  FJD: 2.24,
  FKP: 0.79,
  GBP: 0.79,
  GEL: 2.8,
  GHS: 14.8,
  GIP: 0.79,
  GMD: 67,
  GNF: 8600,
  GTQ: 7.75,
  GYD: 209,
  HKD: 7.82,
  HNL: 24.7,
  HTG: 132,
  HUF: 358,
  IDR: 16200,
  ILS: 3.7,
  INR: 83,
  IQD: 1310,
  IRR: 42000,
  ISK: 139,
  JMD: 155,
  JOD: 0.709,
  JPY: 155,
  KES: 129,
  KGS: 89,
  KHR: 4100,
  KMF: 452,
  KPW: 900,
  KRW: 1370,
  KWD: 0.307,
  KYD: 0.83,
  KZT: 450,
  LAK: 21500,
  LBP: 89500,
  LKR: 300,
  LRD: 194,
  LSL: 18.4,
  LYD: 4.84,
  MAD: 10,
  MDL: 17.7,
  MGA: 4500,
  MKD: 56.6,
  MMK: 2100,
  MNT: 3450,
  MOP: 8.05,
  MRU: 40,
  MUR: 46,
  MVR: 15.4,
  MWK: 1735,
  MXN: 17.1,
  MYR: 4.7,
  MZN: 63.9,
  NAD: 18.4,
  NGN: 1500,
  NIO: 36.8,
  NOK: 10.7,
  NPR: 133,
  NZD: 1.64,
  OMR: 0.385,
  PAB: 1,
  PEN: 3.72,
  PGK: 3.85,
  PHP: 58.2,
  PKR: 278,
  PLN: 3.95,
  PYG: 7500,
  QAR: 3.64,
  RON: 4.57,
  RSD: 107,
  RUB: 90,
  RWF: 1300,
  SAR: 3.75,
  SBD: 8.4,
  SCR: 13.6,
  SDG: 600,
  SEK: 10.6,
  SGD: 1.35,
  SHP: 0.79,
  SLE: 22.5,
  SOS: 571,
  SRD: 32,
  SSP: 1300,
  STN: 22.5,
  SYP: 13000,
  SZL: 18.4,
  THB: 36.7,
  TJS: 10.9,
  TMT: 3.5,
  TND: 3.1,
  TOP: 2.35,
  TRY: 32.2,
  TTD: 6.78,
  TWD: 32.4,
  TZS: 2600,
  UAH: 40,
  UGX: 3800,
  USD: 1,
  UYU: 39,
  UZS: 12600,
  VES: 36,
  VND: 25400,
  VUV: 120,
  WST: 2.75,
  XAF: 604,
  XCD: 2.7,
  XCG: 1.79,
  XOF: 604,
  XPF: 110,
  YER: 250,
  ZAR: 18.4,
  ZMW: 25,
  ZWG: 14,
};

export type ExchangeRates = Record<string, number>;

export type CurrencyRatePayload = {
  base: typeof FX_BASE_CURRENCY;
  rates: ExchangeRates;
  fetchedAt: string;
  source: string;
  isFallback: boolean;
  missingCurrencies: string[];
  cacheTtlSeconds: number;
  cacheExpiresAt: string;
};

export const STATIC_FALLBACK_SOURCE = "static-fallback";

export const exchangeRatesFromUsd = fallbackExchangeRatesFromUsd;

export function getFallbackRatePayload({
  fetchedAt = new Date().toISOString(),
  missingCurrencies = [],
  cacheTtlSeconds = 0,
}: {
  fetchedAt?: string;
  missingCurrencies?: string[];
  cacheTtlSeconds?: number;
} = {}): CurrencyRatePayload {
  const fetchedAtTime = new Date(fetchedAt).getTime();
  const expiresAt = Number.isFinite(fetchedAtTime)
    ? new Date(fetchedAtTime + cacheTtlSeconds * 1000).toISOString()
    : fetchedAt;

  return {
    base: FX_BASE_CURRENCY,
    rates: fallbackExchangeRatesFromUsd,
    fetchedAt,
    source: STATIC_FALLBACK_SOURCE,
    isFallback: true,
    missingCurrencies,
    cacheTtlSeconds,
    cacheExpiresAt: expiresAt,
  };
}

export function convertCurrency(
  amountUsd: number,
  targetCurrency: string,
  rates: ExchangeRates = fallbackExchangeRatesFromUsd
) {
  const normalizedCurrency = targetCurrency.toUpperCase();
  const rate = rates[normalizedCurrency];

  if (rate === undefined) {
    return null;
  }

  return amountUsd * rate;
}

export function resolveDisplayCurrency(
  targetCurrency: string,
  rates: ExchangeRates = fallbackExchangeRatesFromUsd
) {
  const normalizedCurrency = targetCurrency.toUpperCase();

  if (rates[normalizedCurrency] !== undefined) {
    return normalizedCurrency;
  }

  return null;
}

export function isSupportedDisplayCurrency(targetCurrency: string) {
  return fallbackExchangeRatesFromUsd[targetCurrency.toUpperCase()] !== undefined;
}
