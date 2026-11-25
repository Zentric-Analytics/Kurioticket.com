import { AppState } from "react-native";
import { currencySnapshotExpiry } from "../../../../../src/shared/search/freshness";
import { useEffect, useState } from "react";
import { travelApi } from "../../api/travelApi";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import type { ExchangeRates } from "../currency/displayCurrency";

let cachedRates: ExchangeRates | null = null;
let expiresAt=0;
const cacheFresh=()=>Boolean(cachedRates && Date.now()<expiresAt);
let ratesRequest: Promise<ExchangeRates> | null = null;

function loadCurrencyRates() {
  if (cacheFresh()) return Promise.resolve(cachedRates!);
  if (!ratesRequest) {
    ratesRequest = travelApi.currencyRates()
      .then((payload) => {
        expiresAt=currencySnapshotExpiry(payload);
        cachedRates=expiresAt>Date.now()?payload.rates:null;
        return cachedRates??{};
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
  const [rates, setRates] = useState<ExchangeRates>(() => cacheFresh()?cachedRates!:{});

  useEffect(() => {
    let active=true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh=async()=>{
      if(!cacheFresh() && active) setRates({});
      const next=await loadCurrencyRates();
      if(!active) return;
      setRates(next);
      clearTimeout(timer);
      timer=setTimeout(()=>void refresh(),Math.max(1000,cacheFresh()?expiresAt-Date.now():30_000));
    };
    void refresh();
    const subscription=AppState.addEventListener("change",state=>{if(state==="active")void refresh();});
    return ()=>{active=false;clearTimeout(timer);subscription.remove();};
  }, []);

  return { displayCurrency: currency, rates };
}
