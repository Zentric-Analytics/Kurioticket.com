/** Closed catalogue: neither a raw URL nor a dynamic identifier is stored.
 * Native route names and website paths are intentionally separate.
 */
export const pageViewCatalog = {
  home: { label: "Homepage", web: ["/"], native: ["/home"] },
  flights: { label: "Flights", web: ["/flights"], native: ["/flights"], product: "FLIGHT" },
  flight_results: { label: "Flight results", web: ["/flights/results"], native: ["/flight-results"], product: "FLIGHT" },
  flight_details: { label: "Flight details", web: ["/flights/details"], native: ["/flight-details"], product: "FLIGHT" },
  hotels: { label: "Hotels", web: ["/hotels"], native: ["/hotels"], product: "HOTEL" },
  hotel_results: { label: "Hotel results", web: ["/hotels/results"], native: ["/hotel-results"], product: "HOTEL" },
  hotel_details: { label: "Hotel details", web: ["/hotels/details"], native: ["/hotel-details"], product: "HOTEL" },
  cars: { label: "Cars", web: ["/cars"], native: ["/cars"], product: "CAR" },
  car_results: { label: "Car results", web: ["/cars/results"], native: ["/car-results"], product: "CAR" },
  car_details: { label: "Car details", web: ["/cars/details"], native: ["/car-details"], product: "CAR" },
  packages: { label: "Packages", web: ["/packages"], native: ["/packages"], product: "PACKAGE" },
  deals: { label: "Deals", web: ["/deals"], native: ["/deals"] },
  explore: { label: "Explore", web: ["/explore"], native: ["/explore"] },
  destinations: { label: "Destinations", web: ["/destinations"], native: ["/destinations"] },
  saved: { label: "Saved", web: ["/saved"], native: ["/saved"] },
  price_alerts: { label: "Price alerts", web: ["/dashboard/price-alerts"], native: ["/price-alerts"] },
  support: { label: "Support", web: ["/support"], native: ["/support"] },
  faq: { label: "FAQs", web: ["/faq"], native: ["/faq"] },
  legal: { label: "Legal information", web: ["/legal"], native: ["/legal-information"] },
  privacy_policy: { label: "Privacy policy", web: ["/legal/privacy-policy"], native: ["/privacy-policy"] },
  cookie_policy: { label: "Cookie policy", web: ["/legal/cookie-policy"], native: ["/cookie-policy"] },
  terms: { label: "Terms of service", web: ["/legal/terms-of-service"], native: ["/terms-of-service"] },
  dashboard: { label: "Account dashboard", web: ["/dashboard"], native: ["/account"] },
  settings: { label: "Settings", web: ["/dashboard/settings"], native: ["/settings"] },
} as const;
export type PageViewKey = keyof typeof pageViewCatalog;
export type PageViewTransport = "web" | "native";
export function isPageViewKey(value: unknown): value is PageViewKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(pageViewCatalog, value);
}
export function pageViewKey(pathname: string | null | undefined, transport: PageViewTransport): PageViewKey | null {
  if (!pathname || pathname.length > 120 || !pathname.startsWith("/") || pathname.startsWith("//")) return null;
  // Only literal route paths; query strings, fragments, encoded paths and
  // identifiers are not parsed, decoded, persisted or forwarded.
  const path = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  for (const key of Object.keys(pageViewCatalog) as PageViewKey[]) {
    if ((pageViewCatalog[key][transport] as readonly string[]).includes(path)) return key;
  }
  return null;
}
export function pageViewInfo(key: unknown) {
  if (!isPageViewKey(key)) return null;
  const entry = pageViewCatalog[key];
  return { label: entry.label, webPath: entry.web[0], nativePath: entry.native[0],
    product: "product" in entry ? entry.product : null };
}
/** Only public, parameter-free landing pages are safe admin click-throughs.
 * Never link a private customer page or a details/results page requiring IDs.
 */
export function publicPageViewPath(key: unknown): string | null {
  if (!isPageViewKey(key)) return null;
  if (["home","flights","hotels","cars","packages","deals","explore","destinations","support","faq","legal","privacy_policy","cookie_policy","terms"].includes(key)) {
    return pageViewCatalog[key].web[0];
  }
  return null;
}
/** Deduplicate renders of one visible route, not genuine returns to that route.
 * No queue or reconstruction of activity before confirmed consent.
 */
export function createPageViewObserver() {
  let previousContext: string | number | null = null;
  let lastKey: PageViewKey | null = null;
  return (input: { pathname: string | null; transport: PageViewTransport; context: string | number | null; visible: boolean }) => {
    if (input.context === null || input.context !== previousContext) {
      lastKey = null;
      previousContext = input.context;
    }
    if (input.context === null) return null;
    const key = pageViewKey(input.pathname, input.transport);
    if (!key) { lastKey = null; return null; }
    if (!input.visible || key === lastKey) return null;
    const previousPageKey = lastKey;
    lastKey = key;
    return { pageKey: key, ...(previousPageKey ? { previousPageKey } : {}) };
  };
}
