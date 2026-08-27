import { supportedCurrencies } from "../../config/supportedCurrencies";

export type CurrencyPresentation = {
  code: string;
  name: string;
  symbol: string;
};

const currencyByCode = new Map(supportedCurrencies.map((currency) => [currency.code, currency]));

export function getCurrencyPresentation(code: string): CurrencyPresentation | undefined {
  const currency = currencyByCode.get(code);
  return currency ? { ...currency, symbol: currency.symbol ?? currency.code } : undefined;
}

export function getCurrencyPresentations(codes: string[]): CurrencyPresentation[] {
  return codes
    .flatMap((code) => {
      const currency = getCurrencyPresentation(code);
      return currency ? [currency] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export function filterCurrencyPresentations(
  currencies: CurrencyPresentation[],
  query: string,
): CurrencyPresentation[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return currencies;

  return currencies.filter(({ code, name, symbol }) =>
    [code, name, symbol].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

export function getSelectableCurrencyCodes(rates: Record<string, unknown>): string[] {
  return supportedCurrencies
    .map(({ code }) => code)
    .filter((code) => {
      const rate = rates[code];
      return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
    })
    .sort();
}
