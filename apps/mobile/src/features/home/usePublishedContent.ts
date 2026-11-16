import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { AppState } from "react-native";
import { travelApi } from "../../api/travelApi";
import { getApiBaseUrl } from "../../config/apiUrl";
import { useMobileLocalization } from "../../localization/MobileLocalizationProvider";
import { createPublishedResource, parsePublishedFaqs, parsePublishedHome } from "./publishedContent";

const homeResources = new Map<string, ReturnType<typeof createPublishedResource<ReturnType<typeof parsePublishedHome>>>>();
const faqResources = new Map<string, ReturnType<typeof createPublishedResource<ReturnType<typeof parsePublishedFaqs>>>>();
function useResource<T>(resource: ReturnType<typeof createPublishedResource<T>>) {
  const snapshot = useSyncExternalStore(resource.subscribe, resource.snapshot, resource.snapshot);
  useFocusEffect(useCallback(() => {
    void resource.refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void resource.refresh(); });
    return () => subscription.remove();
  }, [resource]));
  return { ...snapshot, refresh: resource.refresh };
}
export function usePublishedHome() {
  const { marketplace, locale } = useMobileLocalization();
  const api = getApiBaseUrl(undefined, __DEV__);
  const origin = api.ok ? api.baseUrl : "";
  const market = marketplace.marketCountryCode;
  const key = `${origin}:${market}:${locale}`;
  let resource = homeResources.get(key);
  if (!resource) {
    resource = createPublishedResource(() => travelApi.homepageContent(market, locale), value => parsePublishedHome(value, origin));
    homeResources.set(key, resource);
  }
  return useResource(resource);
}
export function usePublishedFaqs() {
  const { locale } = useMobileLocalization();
  let resource = faqResources.get(locale);
  if (!resource) { resource = createPublishedResource(() => travelApi.faqContent(locale), parsePublishedFaqs); faqResources.set(locale, resource); }
  return useResource(resource);
}
