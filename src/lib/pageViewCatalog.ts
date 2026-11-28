/** Closed catalogue: neither a raw URL nor a dynamic identifier is stored.
 * Native route names and website paths are intentionally separate.
 */
export const pageViewCatalog = {
  home: { label: "Homepage", web: ["/"], native: ["/", "/home"] },
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
  package_hotel_results: { label: "Package hotel results", web: ["/packages/journey/hotel-results", "/deals/journey/hotel-results"], native: [], product: "PACKAGE" },
  package_hotel_details: { label: "Package hotel details", web: ["/packages/journey/hotel-details", "/deals/journey/hotel-details"], native: [], product: "PACKAGE" },
  package_flight_results: { label: "Package flight results", web: ["/packages/journey/flight-results", "/deals/journey/flight-results"], native: [], product: "PACKAGE" },
  package_flight_details: { label: "Package flight details", web: ["/packages/journey/flight-details", "/deals/journey/flight-details"], native: [], product: "PACKAGE" },
  package_car_results: { label: "Package car results", web: ["/packages/journey/car-results", "/deals/journey/car-results"], native: [], product: "PACKAGE" },
  package_car_details: { label: "Package car details", web: ["/packages/journey/car-details", "/deals/journey/car-details"], native: [], product: "PACKAGE" },
  package_review: { label: "Package review", web: ["/packages/journey/review", "/deals/journey/review"], native: [], product: "PACKAGE" },
  package_handoff: { label: "Package handoff", web: ["/packages/handoff", "/deals/handoff"], native: [], product: "PACKAGE" },
  explore: { label: "Explore", web: ["/explore"], native: ["/explore"] },
  destinations: { label: "Destinations", web: ["/destinations"], native: ["/destinations"] },
  saved: { label: "Saved", web: ["/saved"], native: ["/saved"] },
  price_alerts: { label: "Price alerts", web: ["/dashboard/alerts"], native: ["/price-alerts"] },
  support: { label: "Support", web: ["/support"], native: ["/support"] },
  faq: { label: "FAQs", web: ["/faq"], native: ["/faq"] },
  legal: { label: "Legal information", web: ["/legal"], native: ["/legal-information"] },
  privacy_policy: { label: "Privacy policy", web: ["/legal/privacy-policy"], native: ["/profile/privacy-policy", "/privacy-policy"] },
  cookie_policy: { label: "Cookie policy", web: ["/legal/cookie-policy"], native: ["/cookie-policy"] },
  terms: { label: "Terms of service", web: ["/legal/terms-of-service"], native: ["/profile/terms-of-service", "/terms-of-service"] },
  legal_document: { label: "Legal document", web: ["/legal/[slug]"], native: [] },
  about: { label: "About", web: ["/about"], native: [] },
  contact: { label: "Contact", web: ["/contact"], native: [] },
  how_it_works: { label: "How it works", web: ["/how-it-works"], native: [] },
  service_guarantee: { label: "Service guarantee", web: ["/service-guarantee"], native: [] },
  service_information: { label: "More service information", web: ["/more-service-info"], native: [] },
  guides: { label: "Guides", web: ["/guides"], native: [] },
  guide_article: { label: "Guide article", web: ["/guides/[slug]"], native: [] },
  flight_route_guide: { label: "Flight route guide", web: ["/flights/[slug]"], native: [], product: "FLIGHT" },
  hotel_destination_guide: { label: "Hotel destination guide", web: ["/hotels/[slug]"], native: [], product: "HOTEL" },
  auth_sign_in: { label: "Sign in", web: ["/auth/signin"], native: [] },
  auth_sign_up: { label: "Sign up", web: ["/auth/signup"], native: [] },
  account_onboarding: { label: "Account onboarding", web: ["/onboarding"], native: [] },
  account_security_setup: { label: "Account security setup", web: ["/onboarding/security"], native: [] },
  dashboard: { label: "Account dashboard", web: ["/dashboard"], native: ["/profile", "/account"] },
  account_hub: { label: "My Account", web: ["/dashboard/account"], native: [] },
  account_support: { label: "Account support", web: ["/dashboard/support"], native: [] },
  settings: { label: "Settings", web: ["/dashboard/settings"], native: ["/settings"] },
  trips: { label: "My Trips", web: ["/dashboard/trips"], native: ["/trips"] },
  notifications: { label: "Notifications", web: [], native: ["/notifications"] },
  saved_items: { label: "Saved items", web: ["/saved#saved"], native: [], webSectionOf: "saved" },
  recent: { label: "Recent searches", web: ["/saved#recent"], native: ["/recent"], webSectionOf: "saved" },
  upcoming_trips: { label: "My Trips · Upcoming", web: ["/dashboard/trips#upcoming"], native: [], webSectionOf: "trips" },
  past_trips: { label: "My Trips · Past", web: ["/dashboard/trips#past"], native: [], webSectionOf: "trips" },
  cancelled_trips: { label: "My Trips · Cancelled", web: ["/dashboard/trips#cancelled"], native: [], webSectionOf: "trips" },
  currency: { label: "Currency", web: [], native: ["/currency"] },
  language: { label: "Language", web: [], native: ["/language"] },
  security: { label: "Security settings", web: ["/dashboard/security"], native: ["/security"] },
  personal_information: { label: "Personal information", web: [], native: ["/personal-information"] },
  email_preferences: { label: "Email preferences", web: ["/dashboard/preferences/email"], native: ["/email-preferences"] },
  travel_preferences: { label: "Travel preferences", web: ["/dashboard/preferences/travel"], native: ["/travel-preferences"] },
  customization: { label: "Customization", web: ["/dashboard/preferences/customization"], native: [] },
  edit_flight_search: { label: "Edit flight search", web: [], native: ["/edit-flight-search"], product: "FLIGHT" },
  package_results: { label: "Package results", web: ["/packages/results", "/deals/results"], native: ["/package-results"], product: "PACKAGE" },
  explore_region: { label: "Explore region", web: [], native: ["/explore/region/[region]"] },
  explore_destination: { label: "Explore destination", web: [], native: ["/explore/destination/[id]"] },
  home_flights: { label: "Home · Flights", web: ["/#flights"], native: ["/home#flights"], product: "FLIGHT", webSectionOf: "home" },
  home_hotels: { label: "Home · Hotels", web: ["/#hotels"], native: ["/home#hotels"], product: "HOTEL", webSectionOf: "home" },
  home_cars: { label: "Home · Cars", web: ["/#cars"], native: ["/home#cars"], product: "CAR", webSectionOf: "home" },
  home_packages: { label: "Home · Packages", web: ["/#packages"], native: ["/home#packages"], product: "PACKAGE", webSectionOf: "home" },
} as const;
export type PageViewKey = keyof typeof pageViewCatalog;
export type PageViewTransport = "web" | "native";
const publicLegalDocument = /^\/legal\/(?:privacy-choices|affiliate-disclosure|refund-booking-disclaimer|price-availability-disclaimer|partner-redirect-disclaimer|california-seller-of-travel-notice|legal-notice-company-information|acceptable-use-policy|data-deletion-policy|security-statement|accessibility-statement)$/;
const webDetails = /^\/(flights|hotels|cars)\/details\/[A-Za-z0-9._%:+~=-]{1,160}$/;
const webLanding = /^\/(flights|hotels|guides)\/[a-z0-9][a-z0-9-]{0,159}$/;
export function isPageViewKey(value: unknown): value is PageViewKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(pageViewCatalog, value);
}
export function pageViewKey(pathname: string | null | undefined, transport: PageViewTransport): PageViewKey | null {
  if (!pathname || pathname.length > 240 || !pathname.startsWith("/") || pathname.startsWith("//")) return null;
  if (pathname.includes("?") || pathname.includes("#")) return null;
  // Never decode or forward query strings, fragments or dynamic identifiers.
  const path = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  if (transport === "native") {
    if (/^\/explore\/region\/[^/?#]+$/.test(path)) return "explore_region";
    if (/^\/explore\/destination\/[^/?#]+$/.test(path)) return "explore_destination";
  }
  for (const key of Object.keys(pageViewCatalog) as PageViewKey[]) {
    if (!path.includes("[") && (pageViewCatalog[key][transport] as readonly string[]).includes(path)) return key;
  }
  if (transport !== "web") return null;
  const detail = webDetails.exec(path);
  if (detail) return ({ flights: "flight_details", hotels: "hotel_details", cars: "car_details" } as const)[detail[1] as "flights" | "hotels" | "cars"];
  if (publicLegalDocument.test(path)) return "legal_document";
  const landing = webLanding.exec(path);
  if (landing) return ({ flights: "flight_route_guide", hotels: "hotel_destination_guide", guides: "guide_article" } as const)[landing[1] as "flights" | "hotels" | "guides"];
  return null;
}
export function pageViewInfo(key: unknown) {
  if (!isPageViewKey(key)) return null;
  const entry = pageViewCatalog[key];
  return { label: entry.label, webPath: (entry.web as readonly string[])[0] ?? null, nativePath: (entry.native as readonly string[])[0] ?? null,
    product: "product" in entry ? entry.product : null };
}
export function customerWebSectionHost(key: PageViewKey): PageViewKey | null {
  const entry = pageViewCatalog[key];
  return "webSectionOf" in entry ? entry.webSectionOf : null;
}

/** Shared sign-in can be a redirect into a restricted Admin or recovery flow. */
export function isRestrictedWebSignIn(pathname: string | null, search: string, origin: string) {
  if (pathname !== "/auth/signin") return false;
  const callbacks = new URLSearchParams(search).getAll("callbackUrl");
  return callbacks.some(callback => {
    try {
      const destination = new URL(callback, origin);
      const path = decodeURIComponent(destination.pathname);
      return destination.origin === origin && (path === "/admin" || path.startsWith("/admin/")
        || path === "/account/pending-deletion");
    } catch {
      return true;
    }
  });
}
/** Persist a public route label for journey context, without dynamic identifiers. */
export function customerJourneySourcePath(path: string, transport: PageViewTransport): string | undefined {
  const key = pageViewKey(path, transport);
  if (!key) return undefined;
  const entry = pageViewCatalog[key];
  return entry[transport][0] ?? undefined;
}
export function isCustomerPackageStagePath(path: string | null, stage?: string): boolean {
  if (!path || !pageViewKey(path, "web")) return false;
  const match = /^\/(?:packages|deals)\/journey\/([a-z-]+)\/?$/.exec(path);
  return Boolean(match && (stage === undefined || match[1] === stage));
}
/** Only public, parameter-free landing pages are safe admin click-throughs.
 * Never link a private customer page or a details/results page requiring IDs.
 */
export function publicPageViewPath(key: unknown): string | null {
  if (!isPageViewKey(key)) return null;
  if (["home","flights","hotels","cars","packages","deals","explore","destinations","support","faq","legal","privacy_policy","cookie_policy","terms"].includes(key)) {
    return (pageViewCatalog[key].web as readonly string[])[0] ?? null;
  }
  return null;
}
/** Deduplicate renders of one visible route, not genuine returns to that route.
 * No queue or reconstruction of activity before confirmed consent.
 */
type PageObservation = {
  pathname: string | null;
  transport: PageViewTransport;
  context: string | number | null;
  visible: boolean;
  /** An in-memory discriminator for a committed package detail on the same URL path. */
  pageInstance?: string | null;
};

export function createPageViewObserver() {
  let previousContext: string | number | null = null;
  let last: { key: PageViewKey; occurrence: string; instance: string | null } | null = null;
  return (input: PageObservation) => {
    if (input.context === null || input.context !== previousContext) {
      last = null;
      previousContext = input.context;
    }
    if (input.context === null) return null;
    const key = pageViewKey(input.pathname, input.transport);
    if (!key || !input.pathname) { last = null; return null; }
    // Only the current allowlisted pathname is compared in memory. The event
    // contains its catalogue key, even when consecutive details share a template.
    const occurrence = input.transport === "web" ? input.pathname.replace(/\/$/, "") : key;
    const instance = key === "package_hotel_details" ? input.pageInstance ?? null : null;
    const sameOccurrence = last?.occurrence === occurrence && last.instance === instance;
    if (!input.visible) {
      if (!sameOccurrence) last = null;
      return null;
    }
    if (sameOccurrence) return null;
    const previousPageKey = last?.key;
    last = { key, occurrence, instance };
    return { pageKey: key, ...(previousPageKey ? { previousPageKey } : {}) };
  };
}

export type PageViewPayload = { eventId: string; pageKey: PageViewKey; previousPageKey?: PageViewKey; requestId?: string };
export function pageViewRequestId(value: unknown): string | undefined {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : undefined;
}
export function pageViewCanLink(key: unknown) {
  return key === "package_results" || isPageViewKey(key) && /^(flight|hotel|car)_(results|details)$/.test(key);
}
/** Each committed navigation gets one event ID. Exact search references enrich
 * that event instead of writing another page view. Never link by recency. */
export function createPageViewCapture(createId: () => string) {
  const observe = createPageViewObserver();
  let current: { context: string | number; payload: PageViewPayload } | null = null;
  return (input: PageObservation & { requestId?: unknown }): PageViewPayload | null => {
    const observation = observe(input);
    const key = pageViewKey(input.pathname, input.transport);
    if (input.context === null || !key || current?.context !== input.context || current.payload.pageKey !== key) current = null;
    if (!input.visible || input.context === null || !key) return null;
    const requestId = pageViewCanLink(key) ? pageViewRequestId(input.requestId) : undefined;
    if (observation) {
      const payload: PageViewPayload = { ...observation, eventId: createId(), ...(requestId ? { requestId } : {}) };
      current = { context: input.context, payload };
      return payload;
    }
    if (!current || !requestId || current.payload.requestId) return null;
    // Same event ID even when the response arrives after the page observation.
    // Identical retries are safe, and the server never overwrites a valid link.
    current.payload = { ...current.payload, requestId };
    return current.payload;
  };
}
