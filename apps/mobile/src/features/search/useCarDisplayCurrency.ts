import { useEffect, useState } from "react";
import { travelApi } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { ExchangeRates } from "../currency/displayCurrency";

let cachedRates: ExchangeRates | null = null;
let ratesRequest: Promise<ExchangeRates> | null = null;

function loadCurrencyRates() {
  if (cachedRates) return Promise.resolve(cachedRates);
  if (!ratesRequest) {
    ratesRequest = travelApi.currencyRates()
      .then(({ rates }) => {
        cachedRates = rates;
        return rates;
      })
      // Conversion is enhancement-only; provider currency remains truthful if rates are unavailable.
      .catch((): ExchangeRates => ({}))
      .finally(() => {
        ratesRequest = null;
      });
  }
  return ratesRequest;
}

/**
 * Cars reads the selected currency directly from the canonical app localization context.
 * This hook owns no currency preference or persistence; it only caches exchange-rate data.
 */
export function useCarDisplayCurrency() {
  const { currency } = useMobileLocalization();
  const [rates, setRates] = useState<ExchangeRates>(() => cachedRates ?? {});

  useEffect(() => {
    if (cachedRates) return;
    let active = true;
    void loadCurrencyRates().then((nextRates) => {
      if (active) setRates(nextRates);
    });
    return () => {
      active = false;
    };
  }, []);

  return { displayCurrency: currency, rates };
}
