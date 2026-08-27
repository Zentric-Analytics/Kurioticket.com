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
  return codes.flatMap((code) => {
    const currency = getCurrencyPresentation(code);
    return currency ? [currency] : [];
  });
}

export function filterCurrencyPresentations(
  currencies: CurrencyPresentation[],
  query: string,
): CurrencyPresentation[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return currencies;

  return currencies.filter(({ code, name, symbol }) =>
    [code, name, symbol].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
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
