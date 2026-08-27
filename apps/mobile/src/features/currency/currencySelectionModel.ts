import { supportedCurrencies } from "../../config/supportedCurrencies";

export function getSelectableCurrencyCodes(rates: Record<string, unknown>): string[] {
  return supportedCurrencies
    .map(({ code }) => code)
    .filter((code) => {
      const rate = rates[code];
      return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
    })
    .sort();
}
