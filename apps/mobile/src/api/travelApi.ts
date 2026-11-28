import { getApiBaseUrl } from "../config/apiUrl";
import { abortTravelRequest, travelAbortReason, describeTransportFailure, type TravelFailureCode } from "./travelTransportFailure";
import { applySessionRevocation, readSession, readStoredSession, subscribeSession, type StoredSession } from "../storage/sessionStorage";
import { Platform } from "react-native";
import type { CanonicalLocation } from "@/lib/locations/types";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import type { PublicHotelProviderDetails } from "../../../../src/lib/hotels/hotelProviderDetails";
import type { NormalizedCarResult } from "../../../../src/lib/cars/types";
import type { PublicFlightResult, PublicHotelPropertyDetails, PublicHotelResult } from "../../../../src/lib/types";
import type { HotelRoomOption } from "../../../../src/lib/hotels/hotelRoomOptions";
import type { ContractResult, TravelSearchResponse } from "../../../../src/lib/travel/searchContract";
import type { FlightDetailsResponse } from "../../../../src/lib/flights/flightDetailsContract";
import { parseMobileExploreCatalogue, type MobileExploreCatalogue } from "./exploreCatalogueContract";
import { logFlightSearchCheckpoint } from "../features/search/flightSearchDiagnostics";
import { createSearchDiagnostics } from "../../../../src/shared/search/diagnostics";
import { visitorIdentity } from "../features/privacy/visitorIdentity";
import type { JourneyEvent, JourneyEventResponse } from "../features/privacy/journeyEventCoordinator";
import { rememberJourneyResponseContext } from "../features/privacy/journeyResponseContext";
import { reconcileOrdinarySession } from "../features/auth/authApi";
import { createProviderHandoffMetadata, type ProviderHandoffMetadataReader } from "../../../../src/lib/providerHandoffClient";

export class TravelApiError extends Error {
  constructor(message: string, public status = 0, public code: TravelFailureCode = "network", public details?: Record<string, unknown>) { super(message); }
}

export type FlightResult = ContractResult<PublicFlightResult>;
export type NearbyFlightFare = Pick<PublicFlightResult, "price" | "currency">;
type FlightSearchResponse = TravelSearchResponse<PublicFlightResult> & { resultsCacheValidUntil?: number };
export type MobileFlightDetailsResponse = FlightDetailsResponse;
export type FlightRedirectResponse = { url: string };
export type HotelResult = ContractResult<PublicHotelResult>;
export type HotelSearchResponse = TravelSearchResponse<PublicHotelResult> & {
  warningCategory?: "provider_unavailable" | string;
  nextCursor?: string | null;
  progressive?: boolean;
  completed?: boolean;
  estimatedTotal?: number;
};
export type MobileHotelDetailsResponse = { hotel: PublicHotelResult; propertyDetails: PublicHotelPropertyDetails | null; locationDetails?: PublicHotelPropertyDetails | null; providerDetails?: PublicHotelProviderDetails | null; propertyOffers?: Array<{ hotel: PublicHotelResult; providerDetails: PublicHotelProviderDetails | null }>; roomOptions: HotelRoomOption[]; relatedHotels: PublicHotelResult[]; relatedHotelsHasMore?: boolean };
export type MobileHotelDetailsRequest = { id: string; destination: string; checkIn: string; checkOut: string; guests: number; rooms: number };
export type CarResult = ContractResult<NormalizedCarResult>;
export type PackageComponent = { status: "success" | "empty" | "unavailable"; results: (FlightResult | HotelResult | CarResult)[]; warnings: string[]; source: string; requestId: string };
export type PackageSearchResponse = { mode: string; status: "success" | "partial" | "empty" | "unavailable"; requestId?: string; components: Partial<Record<"flight" | "hotel" | "car", PackageComponent>>; packageOffers: unknown[] };
export type MobileTrip = { id: string; providerConfirmationCode: string; providerName: string; tripType: string; status: "upcoming" | "past" | "cancelled"; origin: string | null; destination: string; departureDate: string; returnDate: string | null; travelerCount: number; currency: string; totalAmount: number | null; providerAction: { url: string; label: string; external: true } | null; providerConfirmed: boolean; providerConfirmedAt: string | null };
export type MobileFlightStatus =
  | { dataAvailable: false; providerName: string }
  | { dataAvailable: true; providerName: string; status: "scheduled" | "delayed" | "departed" | "arrived" | "cancelled" | "unknown"; flight: { flightNumber: string; carrierCode: string; originAirport: string; destinationAirport: string; scheduledDepartureAt: string; scheduledArrivalAt: string | null }; timing: { estimatedDepartureAt: string | null; actualDepartureAt: string | null; estimatedArrivalAt: string | null; actualArrivalAt: string | null }; lastUpdatedAt: string; freshness: "current" | "stale" };
export type MobileProfile = { fullName?: string | null; phoneNumber?: string | null; phoneCountryCode?: string | null; dateOfBirth?: string | null; gender?: string | null; nationality?: string | null; address?: string | null };
export type MobilePriceAlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED";
export type MobilePriceAlert = { id: string; type: "FLIGHT" | "HOTEL" | "CAR"; origin: string | null; destination: string; targetPrice: string | null; mode?: "AUTOMATIC" | "TARGET"; currency: string | null; status: MobilePriceAlertStatus; createdAt: string; updatedAt: string; lastSeenPrice: string | null; lastCheckedAt: string | null; query: Record<string, unknown> };
export type CreateFlightPriceAlert = { type: "FLIGHT"; origin: string; destination: string; currency: string; query: Record<string, unknown> } & ({ mode: "AUTOMATIC"; baselinePrice: number } | { mode?: "TARGET"; targetPrice: number });
export type CreateHotelPriceAlert = { type: "HOTEL"; destination: string; targetPrice: number; mode: "TARGET"; currency: string; query: Record<string, unknown> };
export type CreateCarPriceAlert = { type: "CAR"; origin: string; destination: string; currency: string; query: Record<string, unknown> } & ({ mode: "AUTOMATIC"; baselinePrice: number } | { mode: "TARGET"; targetPrice: number });
export type CurrencyRates = { base: string; rates: Record<string, number>; fetchedAt: string; source: string; stale?: boolean; cacheExpiresAt?: string };
export type MobileLocation = { source: "ipinfo-lite" | "fallback"; countryCode: string | null; country: string | null; continentCode: string | null; continent: string | null; ipDetected: boolean };
export type MobileNotificationType = "PRICE_ALERT" | "SUPPORT_UPDATE" | "ACCOUNT_UPDATE" | "SECURITY_UPDATE" | "SYSTEM" | "TRAVEL_INSIGHT";
export type MobileNotificationActionPath = "/price-alerts" | "/saved" | "/settings" | "/personal-information" | "/security" | "/support";
export type MobileNotification = { id: string; type: MobileNotificationType; title: string; body: string; actionPath: MobileNotificationActionPath | null; metadata: Record<string, unknown> | null; readAt: string | null; createdAt: string };
export type MobileNotificationPage = { items: MobileNotification[]; nextCursor: string | null };
export type CustomizationPreferences = { locale: string; currency: string; region: string; personalizeRecommendations: boolean };
export type SupportCategory = "search-help" | "price-alerts" | "redirect" | "account";
export type SupportTicketInput = { email: string; subject: string; category: SupportCategory; body: string; sourceContext?: { page: "mobile_support"; platform: "ios" | "android" } };
export type EmailPreferences = { receiveOptionalEmails: boolean; priceAlerts: boolean; travelInspiration: boolean; productUpdates: boolean; dealsRecommendations: boolean };
export type TravelPreferences = { homeAirport: string; preferredAirlines: string[]; notificationPreferences: { emailUpdates: boolean; priceAlertEmails: boolean; travelInspirationEmails: boolean } };
export type TravelPreferencesPatch = Partial<Pick<TravelPreferences, "homeAirport" | "preferredAirlines">>;
export type MobileSavedItem = { id: string; type: "flight" | "hotel" | "car" | "search"; [key: string]: unknown };
export type CreateMobileSavedItem = { type: "flight" | "hotel" | "car" | "search"; [key: string]: unknown };
export type MobileRecentSearch = { id: string; type: "flight" | "hotel" | "car" | "package"; label: string; subtitle: string; href: string; params: unknown; createdAt: string; updatedAt: string };
export type CreateMobileRecentSearch = Omit<MobileRecentSearch, "createdAt" | "updatedAt">;
export type FeatureAvailability = { flightSearch: boolean; hotelSearch: boolean; carSearch: boolean; deals: boolean; priceAlerts: boolean };
export type MobilePasskey = { id:string; name:string; createdAt:string; lastUsedAt:string|null; deviceType:string|null; backedUp:boolean|null; label:string };
export type PasskeyRegistrationOptions = Record<string, unknown>;
export type SecurityOverview = { hasPassword: boolean; twoFactorEnabled: boolean; securityEmailAlerts: boolean };
export type SecuritySession = { id:string; client:string; platform:string|null; deviceLabel:string; browser:string|null; os:string|null; maskedIp:string|null; lastSeenAt:string; isCurrent:boolean };
export type TwoFactorSetup = { otpauthUri:string; manualSetupKey:string; expiresAt:string };
export type TwoFactorStatus = { enabled:boolean; method:string|null; enabledAt:string|null; disabledAt:string|null; recoveryCodesRemaining:number };
export type AccountDeletionRequest = { id:string; status:string; requestedAt:string; deletionScheduledAt:string; cancelledAt:string|null; completedAt:string|null; canReactivate:boolean };
export type HotelDestinationKind = "city" | "district" | "landmark" | "airport-area" | "custom";
export type HotelDestinationSuggestion = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  kind: HotelDestinationKind;
  searchValue: string;
  aliases?: string[];
  canonical?: CanonicalLocation;
};
/** Allows the shared server orchestrator to finish polling slower providers. */
export const METASEARCH_REQUEST_TIMEOUT_MS = 35_000;

function apiErrorMessage(data: Record<string, unknown>) {
  if (typeof data.error === "string") return data.error;
  if (
    typeof data.error === "object" &&
    data.error !== null &&
    !Array.isArray(data.error) &&
    typeof (data.error as Record<string, unknown>).message === "string"
  ) {
    return (data.error as { message: string }).message;
  }
  return "Kurioticket could not complete this request.";
}

// Ephemeral operational search continuity; never persisted as analytics tracking.
let operationalSearchCredential: string | null = null;
let operationalSearchActor: string | null = null;
const operationalCredentialListeners = new Set<() => void>();
export function subscribeOperationalSearchCredential(listener: () => void) {
  operationalCredentialListeners.add(listener);
  return () => { operationalCredentialListeners.delete(listener); };
}
function setOperationalSearchCredential(credential: string | null) {
  if (operationalSearchCredential === credential) return;
  operationalSearchCredential = credential;
  operationalSearchReferences.clear();
  for (const listener of operationalCredentialListeners) {
    try { listener(); } catch { /* Optional presence observers cannot interrupt a search. */ }
  }
}
const operationalPaths = new Set(["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/mobile/v1/hotels/progressive", "/api/redirect"]);
/** Identify the real Android application and transport, never a browser. */
export function carSearchClientHeaders(platform: string, version?: string): Record<string, string> {
  if (platform !== "android" || !version || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version)) return {};
  return { "User-Agent": `KurioticketMobile/${version} (Android; Native) OkHttp` };
}
const operationalCredentialPattern = /^v(?:1\.[0-9a-f-]{36}\.[0-9]{10,13}\.(?:staging|production)|2\.[0-9a-f-]{36}\.[0-9]{10,13}\.(?:staging|production)\.(?:ios|android))\.[A-Za-z0-9_-]{43}$/;
// Only successful first-party search responses can supply this temporary
// handoff context. No analytics identity, event queue or disk persistence.
const operationalSearchReferences = new Map<string, { epoch: number; credential: string; expiresAt: number }>();
const operationalRequestPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const operationalSearchPaths = new Set(["/api/flights/search", "/api/hotels/search", "/api/cars/search", "/api/mobile/v1/hotels/progressive"]);
function rememberOperationalSearchResponse(value: unknown, epoch: number, credential: string | null) {
  if (epoch !== accountEpoch || !credential || credential !== operationalSearchCredential || typeof value !== "string" || !operationalRequestPattern.test(value)) return;
  const now = Date.now();
  const expiresAt = Number(credential.split(".")[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) return;
  for (const [id, reference] of operationalSearchReferences) {
    if (reference.expiresAt <= now || reference.credential !== credential) operationalSearchReferences.delete(id);
  }
  const id = value.toLowerCase();
  operationalSearchReferences.delete(id);
  while (operationalSearchReferences.size >= 64) operationalSearchReferences.delete(operationalSearchReferences.keys().next().value!);
  operationalSearchReferences.set(id, { epoch, credential, expiresAt });
}

let accountEpoch = 0;
let observedSessionToken: string | null | undefined;
/** Presence may reuse this exact search-owned memory state, never another
 * credential cache or a credential created by opening the app. */
export function readExistingGuestOperationalSearchCredential(): string | null {
  const platform = Platform.OS;
  if ((platform !== "ios" && platform !== "android") || observedSessionToken !== null
      || operationalSearchActor !== null || !operationalSearchCredential) return null;
  const base = getApiBaseUrl(platform, __DEV__);
  if (!base.ok || base.baseUrl !== "https://staging.kurioticket.com") return null;
  const credential = operationalSearchCredential;
  if (!operationalCredentialPattern.test(credential)) return null;
  const parts = credential.split(".");
  const expiresAt = Number(parts[2]);
  const now = Date.now();
  return parts[0] === "v2" && parts[3] === "staging" && parts[4] === platform
    && Number.isSafeInteger(expiresAt) && expiresAt > now && expiresAt <= now + 30 * 60_000
    ? credential : null;
}
const accountPath = /^\/api\/mobile\/v1\/(?:profile|email-change|saved|recent-searches|price-alerts|trips|travel-preferences|customization-preferences|email-preferences|notifications|security)(?:[/?]|$)/;
subscribeSession?.(session => {
  const token = session?.token ?? null;
  const changed = token !== observedSessionToken;
  observedSessionToken = token;
  if (changed) {
    accountEpoch++;
    setOperationalSearchCredential(null);
    operationalSearchReferences.clear();
  }
});

async function request<T>(path: string, init: RequestInit = {}, options: { signal?: AbortSignal; timeoutMs?: number; requestId?: string; sandboxDisplay?: boolean; visitorContext?: number; body?: () => unknown; expectedUserId?: string; session?: StoredSession } = {}) {
  const requestStartedAt = Date.now();
  const product = path === "/api/flights/search" ? "flight" : path === "/api/cars/search" ? "car" : "hotel";
  const diagnosticId = operationalSearchPaths.has(path) ? options.requestId : undefined;
  const diagnosticStartedAt = performance.now();
  let trace = createSearchDiagnostics(product, diagnosticId, "native", { platform: Platform.OS, span: "transport", startedAt: diagnosticStartedAt });
  trace("initiation");
  const base = getApiBaseUrl(Platform.OS, __DEV__);
  if (!base.ok) { trace("terminal", { category: "configuration" }); throw new TravelApiError(base.message, 0, "configuration"); }
  const startingEpoch = accountEpoch;
  const session = options.session ?? await readSession().catch(() => null);
  const ordinarySession = session?.recovery ? null : session;
  const actor = ordinarySession?.user?.id ?? null;
  if (observedSessionToken === undefined) observedSessionToken = ordinarySession?.token ?? null;
  const epoch = accountEpoch;
  const accountOwned = accountPath.test(path);
  if (options.expectedUserId && actor !== options.expectedUserId) throw new TravelApiError("Account changed. Refresh before trying again.", 0, "cancelled");
  if (options.visitorContext !== undefined && (startingEpoch !== epoch || (ordinarySession?.token ?? null) !== observedSessionToken)) {
    throw new TravelApiError("Account changed. Discarding the previous activity.", 0, "cancelled");
  }
  if (operationalSearchActor !== actor) {
    operationalSearchActor = actor;
    setOperationalSearchCredential(null);
    operationalSearchReferences.clear();
  }
  const visitorHeaders = await visitorIdentity.headers(path, ordinarySession).catch(() => ({}));
  const requestVisitorContext = "x-kt-visitor" in visitorHeaders ? visitorIdentity.trackingContext() : null;
  // Session/storage work may have changed consent or account ownership since an
  // optional event was queued. Never send it under the replacement identity.
  if (options.signal?.aborted || (options.visitorContext !== undefined && (requestVisitorContext !== options.visitorContext || epoch !== accountEpoch))) {
    trace("terminal", { category: "cancelled" });
    throw new TravelApiError("Request cancelled.", 0, "cancelled");
  }
  if (accountOwned && epoch !== accountEpoch) throw new TravelApiError("Account changed. Discarding the previous request.", 0, "cancelled");
  const controller = new AbortController();
  const onAbort = () => { trace("cancelled", { category: typeof travelAbortReason(options.signal) === "string" ? String(travelAbortReason(options.signal)) : "cancelled" }); abortTravelRequest(controller, String(travelAbortReason(options.signal) ?? "cancelled")); };
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const deadlineMs = options.timeoutMs ?? 20000;
  const timerStartedAt = performance.now();
  trace("timer-start", { deadlineMs });
  const timeout = setTimeout(() => { trace("timer-expired", { deadlineMs, category: "timeout" }); abortTravelRequest(controller, "timeout"); }, deadlineMs);
  try {
    const sentOperationalCredential = operationalPaths.has(path) && epoch === accountEpoch && actor === operationalSearchActor ? operationalSearchCredential : null;
    const response = await fetch(`${base.baseUrl}${path}`, {
      ...init,
      ...(options.body ? { body: JSON.stringify(options.body()) } : {}),
      signal: controller.signal,
      headers: {
        ...(options.sandboxDisplay ? {"x-sandbox-results-policy":"1"} : {}),
        Accept: "application/json",
        "Content-Type": "application/json",
        ...((path === "/api/cars/search" || (/^https:\/\/(?:www\.)?kurioticket\.com$/.test(base.baseUrl) && ["/api/flights/search","/api/hotels/search","/api/mobile/v1/hotels/progressive"].includes(path))) ? carSearchClientHeaders(Platform.OS, Constants.expoConfig?.version) : {}),
        "X-Mobile-Platform": Platform.OS,
        ...(operationalPaths.has(path) && (Platform.OS === "android" || Platform.OS === "ios") ? { "X-Kt-Search-Protocol": "v2" } : {}),
        ...(Constants.expoConfig?.version ? { "X-Mobile-App-Version": Constants.expoConfig.version } : {}),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...visitorHeaders,
        ...(sentOperationalCredential ? { "X-Kt-Search-Session": sentOperationalCredential } : {}),
        ...(options.requestId ? { "X-Search-Request-Id": options.requestId } : {}),
        ...init.headers,
      },
    });
    trace("response-received", { status: response.status, bytes: Number(response.headers.get("content-length")) || undefined });
    let responseOperationalCredential = sentOperationalCredential;
    if (operationalPaths.has(path) && epoch === accountEpoch && actor === operationalSearchActor) {
      const credential = response.headers.get("X-Kt-Search-Session");
      if (credential && operationalCredentialPattern.test(credential)) {
        setOperationalSearchCredential(credential);
        responseOperationalCredential = credential;
      }
    }
    if (path === "/api/flights/search") {
      logFlightSearchCheckpoint("flight-search:response-received", {
        requestId: options.requestId,
        responseBytes: response.headers.get("content-length"),
        elapsedMs: Date.now() - requestStartedAt,
        platform: Platform.OS,
      });
    }
    const jsonStartedAt = performance.now();
    trace("body-start");
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch (error) {
      const failure = describeTransportFailure(error, controller.signal, options.signal, "body");
      throw new TravelApiError(failure.message, failure.code === "invalid-json" ? response.status : 0, failure.code);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TravelApiError("The search provider returned an invalid response.", response.status, "invalid-schema");
    }
    const data = parsed as Record<string, unknown>;
    // Progressive responses may establish a canonical server search ID distinct
    // from the first-party client attempt ID. Neither ID is a supplier track ID.
    if (diagnosticId && typeof data.requestId === "string" && data.requestId !== diagnosticId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId)) {
      trace = createSearchDiagnostics(product, data.requestId, "native", { platform: Platform.OS, span: "transport", startedAt: diagnosticStartedAt });
      trace("correlation", { relatedRequestId: diagnosticId });
    }
    if (response.ok && operationalSearchPaths.has(path) && !Array.isArray(data.results)) {
      throw new TravelApiError("The search provider returned an invalid response.", response.status, "invalid-schema");
    }
    if ((accountOwned || options.expectedUserId) && epoch !== accountEpoch) throw new TravelApiError("Account changed. Discarding the previous response.", 0, "cancelled");
    const responseJsonMs = performance.now() - jsonStartedAt;
    trace("body-complete", { durationMs: responseJsonMs, count: Array.isArray(data.results) ? data.results.length : undefined });
    if (path === "/api/flights/search") {
      logFlightSearchCheckpoint("flight-search:parsed", {
        requestId: options.requestId,
        resultCount: Array.isArray(data.results) ? data.results.length : undefined,
        elapsedMs: Date.now() - requestStartedAt,
        platform: Platform.OS,
      });
    }
    if (!response.ok) {
      if (response.status === 401 && accountOwned && ordinarySession) {
        await reconcileOrdinarySession(ordinarySession).catch(() => undefined);
        if (epoch !== accountEpoch) throw new TravelApiError("Account changed. Discarding the previous response.", 0, "cancelled");
      }
      const code = response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status === 503 ? "unavailable" : response.status >= 500 ? "server" : "http";
      throw new TravelApiError(apiErrorMessage(data), response.status, code, data);
    }
    if (path === "/api/flights/search") {
      const mobileRoundTripMs = Date.now() - requestStartedAt;
      data.mobileRoundTripMs = mobileRoundTripMs;
    }
    if (operationalSearchPaths.has(path)) rememberOperationalSearchResponse(data.requestId, epoch, responseOperationalCredential);
    if (operationalSearchPaths.has(path) || path === "/api/packages/search") rememberJourneyResponseContext(data, requestVisitorContext);
    trace("terminal", { category: "success", count: Array.isArray(data.results) ? data.results.length : undefined, completed: data.completed !== false && !data.nextCursor });
    return data as T;
  } catch (error) {
    if (error instanceof TravelApiError) { trace("terminal", { category: error.code }); throw error; }
    const failure = describeTransportFailure(error, controller.signal, options.signal, "fetch");
    trace("terminal", { category: failure.code });
    throw new TravelApiError(failure.message, 0, failure.code);
  } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", onAbort); trace("timer-stop", { durationMs: performance.now() - timerStartedAt }); }
}

type RedirectOptions = { signal?: AbortSignal; sourcePage?: string; handoff?: ProviderHandoffMetadataReader; operationalRequestId?: string };

function providerRedirect(id: string, type: "flight" | "hotel", options: RedirectOptions = {}) {
  const handoff = options.handoff ?? createProviderHandoffMetadata(() => null, randomUUID);
  const idFromSearch = typeof options.operationalRequestId === "string" && operationalRequestPattern.test(options.operationalRequestId)
    ? options.operationalRequestId.toLowerCase() : null;
  const reference = idFromSearch ? operationalSearchReferences.get(idFromSearch) : undefined;
  // Recheck after async identity/session restoration. Missing context is fine:
  // the customer's verified provider link must still work.
  let eligible = Boolean(reference && reference.expiresAt > Date.now());
  const operationalReference = () => {
    eligible = eligible && Boolean(idFromSearch && reference && operationalSearchReferences.get(idFromSearch) === reference
      && reference.epoch === accountEpoch && reference.credential === operationalSearchCredential && reference.expiresAt > Date.now());
    return eligible && idFromSearch ? { operationalRequestId: idFromSearch } : {};
  };
  return request<FlightRedirectResponse>("/api/redirect", { method: "POST" }, {
    signal: options.signal,
    // Resolve correlation after the transport restores/synchronizes its identity.
    body: () => ({ id, type, sourcePage: options.sourcePage ?? `native_${type}_details`, ...handoff(), ...operationalReference() }),
  });
}

async function fetchExploreCatalogue(): Promise<MobileExploreCatalogue> {
  const response = await request<{ data?: unknown }>("/api/mobile/v1/explore/catalogue");
  const catalogue = parseMobileExploreCatalogue(response.data);
  if (!catalogue) {
    throw new TravelApiError("Explore returned an invalid catalogue.", 200, "invalid-response");
  }
  return catalogue;
}

export const travelApi = {
  featureAvailability: () => request<FeatureAvailability>("/api/feature-availability"),
  homepageContent: (market: string, locale: string) => request<unknown>(`/api/content/homepage?market=${encodeURIComponent(market)}&locale=${encodeURIComponent(locale)}`),
  faqContent: (locale: string) => request<unknown>(`/api/content/faqs?locale=${encodeURIComponent(locale)}`),
  journeyEvent: (body: JourneyEvent, options: { signal: AbortSignal; visitorContext: number }) => request<JourneyEventResponse>("/api/journey/events", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: 4000 }),
  pageView: (body: { eventId: string; pageKey: string; previousPageKey?: string; requestId?: string }, options: { visitorContext: number; signal?: AbortSignal }) =>
    request<{ accepted: boolean; retryable?: boolean }>("/api/activity/page-views", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: 4000 }),
  customerInteraction: (body: {
    action: "share_sheet_completed" | "share_sheet_requested" | "saved_item_confirmed" | "saved_item_removed"; product: "FLIGHT" | "HOTEL" | "CAR";
    resultId: string; eventId: string; requestId?: string;
    observedResult?: { label: string; provider: string; amount: number; currency: string;
      priceBasis: "total" | "per_night" | "per_day"; totalAmount?: number };
  }, options: { visitorContext: number; signal?: AbortSignal }) =>
    request<{ accepted: boolean; retryable?: boolean }>("/api/activity/interactions", {
      method: "POST", body: JSON.stringify(body),
    }, { ...options, timeoutMs: 4000 }),
  searchFlights: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string; sandboxDisplay?: boolean }) => request<FlightSearchResponse>("/api/flights/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  lookupNearbyFlightFare: (body: Record<string, unknown>, options?: { signal?: AbortSignal }) => request<{ fares: NearbyFlightFare[]; requestId: string; resultsCacheValidUntil?: number }>("/api/flights/nearby-fare", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  flightDetails: (id: string, options: { signal?: AbortSignal } = {}) => request<FlightDetailsResponse>(`/api/flights/details?id=${encodeURIComponent(id)}`, {}, options),
  flightRedirect: (id: string, options: RedirectOptions = {}) => providerRedirect(id, "flight", options),
  searchHotels: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string; sandboxDisplay?: boolean }) => request<HotelSearchResponse>("/api/hotels/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  searchHotelsProgressive: (body: Record<string, unknown>, cursor: string | null, options?: { signal?: AbortSignal; requestId?: string; sandboxDisplay?: boolean }) => request<HotelSearchResponse>("/api/mobile/v1/hotels/progressive", { method: "POST", body: JSON.stringify(cursor ? { cursor } : { search: body }) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  hotelRedirect: (id: string, options: RedirectOptions = {}) => providerRedirect(id, "hotel", options),
  hotelDetails: (input: MobileHotelDetailsRequest, options: { signal?: AbortSignal } = {}) => {
    const params = new URLSearchParams({ id: input.id, destination: input.destination, checkIn: input.checkIn, checkOut: input.checkOut, guests: String(input.guests), rooms: String(input.rooms), relatedLimit: "12" });
    return request<MobileHotelDetailsResponse>(`/api/hotels/details?${params.toString()}`, {}, options);
  },
  searchHotelDestinations: (query: string, options: { signal?: AbortSignal; countryCode?: string; locale?: string; limit?: number } = {}) => {
    const params = new URLSearchParams({ q: query.trim(), limit: String(options.limit ?? 8) });
    if (options.countryCode) params.set("countryCode", options.countryCode);
    if (options.locale) params.set("locale", options.locale);
    return request<{ suggestions?: HotelDestinationSuggestion[] }>(`/api/hotels/destinations?${params.toString()}`, {}, { signal: options.signal, sandboxDisplay: true });
  },
  carDetails: (id: string, options?: { signal?: AbortSignal; sandboxDisplay?: boolean }) => request<{results: CarResult[]}>(`/api/cars/details?id=${encodeURIComponent(id)}`, {}, options),
  searchCars: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string; sandboxDisplay?: boolean }) => request<TravelSearchResponse<NormalizedCarResult>>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  searchPackages: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string; sandboxDisplay?: boolean }) => request<PackageSearchResponse>("/api/packages/search", { method: "POST", body: JSON.stringify(body) }, options),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  flightStatus: (tripId: string) => request<MobileFlightStatus>(`/api/mobile/v1/trips/${encodeURIComponent(tripId)}/flight-status`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
  securityOverview: () => request<{ overview: SecurityOverview }>("/api/mobile/v1/security/overview"),
  passkeys: () => request<{passkeys:MobilePasskey[]}>("/api/mobile/v1/security/passkeys"),
  passkeyReauth: (body:{action?:"send-email-code"|"verify";purpose:"setup"|"removal";code?:string;password?:string}) => request<{ok?:true;method:string;purpose:string;reauthToken?:string;expiresAt?:string}>("/api/mobile/v1/security/passkeys/reauth",{method:"POST",body:JSON.stringify(body)}),
  passkeyRegistrationOptions: (reauthToken:string) => request<{options:PasskeyRegistrationOptions}>("/api/mobile/v1/security/passkeys/register/options",{method:"POST",body:JSON.stringify({reauthToken})}),
  verifyPasskeyRegistration: (body:{name:string;response:Record<string,unknown>}) => request<{ok:true}>("/api/mobile/v1/security/passkeys/register/verify",{method:"POST",body:JSON.stringify(body)}),
  renamePasskey: (id:string,name:string) => request<{ok:true}>(`/api/mobile/v1/security/passkeys/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({name})}),
  removePasskey: (id:string,reauthToken:string) => request<{ok:true}>(`/api/mobile/v1/security/passkeys/${encodeURIComponent(id)}`,{method:"DELETE",body:JSON.stringify({reauthToken})}),
  updateSecurityPreference: (securityEmailAlerts:boolean) => request<{preferences:{securityEmailAlerts:boolean}}>("/api/mobile/v1/security/preferences",{method:"PATCH",body:JSON.stringify({securityEmailAlerts})}),
  changePassword: (body:{currentPassword:string;newPassword:string;confirmPassword:string}) => request<{success:true}>("/api/mobile/v1/security/password",{method:"PATCH",body:JSON.stringify(body)}),
  requestAccountPasswordReset: () => request<{ok:true}>("/api/mobile/v1/security/password",{method:"POST"}),
  securitySessions: () => request<{sessions:SecuritySession[]}>("/api/mobile/v1/security/sessions"),
  revokeSecuritySession: (sessionId:string) => request<{success:true}>("/api/mobile/v1/security/sessions/revoke",{method:"PATCH",body:JSON.stringify({sessionId})}),
  revokeAllSecuritySessions: () => request<{success:true}>("/api/mobile/v1/security/sessions/revoke-all",{method:"POST"}),
  revokeOtherSecuritySessions: () => request<{success:true}>("/api/mobile/v1/security/sessions/revoke-others",{method:"POST"}),
  startTwoFactorSetup: () => request<{setup:TwoFactorSetup}>("/api/mobile/v1/security/two-factor/setup",{method:"POST"}),
  confirmTwoFactor: (code:string) => request<{ok:true;twoFactor:TwoFactorStatus;recoveryCodes:string[]}>("/api/mobile/v1/security/two-factor/confirm",{method:"POST",body:JSON.stringify({code})}),
  disableTwoFactor: (verification:{code?:string;password?:string}) => request<{ok:true;twoFactor:TwoFactorStatus}>("/api/mobile/v1/security/two-factor/disable",{method:"POST",body:JSON.stringify(verification)}),
  getDeletionRequest: () => request<{request:AccountDeletionRequest|null}>("/api/mobile/v1/security/deletion-request"),
  requestDeletion: async () => {
    const session = await readSession();
    if (!session) throw new TravelApiError("Authentication required.", 401);
    const result = await request<{ request: AccountDeletionRequest; created: boolean }>(
      "/api/mobile/v1/security/deletion-request",
      { method: "POST", body: JSON.stringify({ confirmed: true }) },
      { session },
    );
    const deletion = result.request;
    if (!deletion?.id || !["PENDING", "READY_FOR_REVIEW"].includes(deletion.status) || !Number.isFinite(Date.parse(deletion.deletionScheduledAt))) {
      throw new TravelApiError("Unable to confirm the account deletion request.", 0, "invalid-response");
    }
    await applySessionRevocation(session.token, { deadline: deletion.deletionScheduledAt });
    return result;
  },
  reactivateDeletion: async (verifiedToken: string) => {
    const session = await readStoredSession();
    if (!session?.recovery || session.token !== verifiedToken || !(Math.min(Date.parse(session.expires), Date.parse(session.recovery.deadline)) > Date.now())) {
      throw new TravelApiError("Recovery sign-in expired. Sign in again.", 401);
    }
    const result = await request<{ success: true; request: { id: string; status: string; cancelledAt: string | null } }>(
      "/api/mobile/v1/security/deletion-request/reactivate",
      { method: "POST", body: JSON.stringify({ confirmed: true }) },
      { session },
    );
    if (result.success !== true || result.request?.status !== "CANCELLED") {
      throw new TravelApiError("Unable to confirm account recovery.", 0, "invalid-response");
    }
    if ((await readStoredSession())?.token !== verifiedToken) {
      throw new TravelApiError("Account changed. Discarding the previous response.", 0, "cancelled");
    }
    return result;
  },
  updateProfile: (profile: MobileProfile) => request<{ profile: MobileProfile }>("/api/mobile/v1/profile", { method: "PATCH", body: JSON.stringify(profile) }),
  requestCurrentEmailCode: () => request<{ cooldownSeconds: number; resendLimitReached?: boolean }>("/api/mobile/v1/email-change/current-request", { method: "POST", body: JSON.stringify({}) }),
  verifyCurrentEmailCode: (code: string) => request<{ ownershipProof: string }>("/api/mobile/v1/email-change/current-confirm", { method: "POST", body: JSON.stringify({ code }) }),
  requestEmailChange: (newEmail: string, ownershipProof: string) => request<{ cooldownSeconds: number; resendLimitReached?: boolean }>("/api/mobile/v1/email-change/request", { method: "POST", body: JSON.stringify({ newEmail, ownershipProof }) }),
  confirmEmailChange: (newEmail: string, code: string, ownershipProof: string) => request<{ email: string; userId: string }>("/api/mobile/v1/email-change/confirm", { method: "POST", body: JSON.stringify({ newEmail, code, ownershipProof }) }),
  customizationPreferences: (expectedUserId?: string) => request<{ hasPreferences: boolean; preferences: CustomizationPreferences }>("/api/mobile/v1/customization-preferences", {}, { expectedUserId }),
  updateCustomizationPreferences: (preferences: Partial<CustomizationPreferences> & { initializeIfAbsent?: boolean }, expectedUserId?: string) => request<{ preferences: CustomizationPreferences }>("/api/mobile/v1/customization-preferences", { method: "PATCH", body: JSON.stringify(preferences) }, { expectedUserId }),
  createSupportTicket: (input: SupportTicketInput) => request<{ ticket: { id: string; subject: string } }>("/api/mobile/v1/support/tickets", { method: "POST", body: JSON.stringify(input) }),
  emailPreferences: () => request<{ hasPreferences: boolean; preferences: EmailPreferences }>("/api/mobile/v1/email-preferences"),
  updateEmailPreferences: (preferences: EmailPreferences) => request<{ preferences: EmailPreferences }>("/api/mobile/v1/email-preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  travelPreferences: () => request<{ hasPreferences: boolean; preferences: TravelPreferences }>("/api/mobile/v1/travel-preferences"),
  updateTravelPreferences: (preferences: TravelPreferencesPatch) => request<{ preferences: TravelPreferences }>("/api/mobile/v1/travel-preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  savedItems: (expectedUserId?: string) => request<{ items: MobileSavedItem[]; summary: Record<string, number> }>("/api/mobile/v1/saved", {}, { expectedUserId }),
  createSavedItem: (input: CreateMobileSavedItem, expectedUserId?: string) => request<{ item: MobileSavedItem }>("/api/mobile/v1/saved", { method: "POST", body: JSON.stringify(input) }, { expectedUserId }),
  deleteSavedItem: (type: MobileSavedItem["type"], id: string, expectedUserId?: string) => request<{ success: true }>("/api/mobile/v1/saved", { method: "DELETE", body: JSON.stringify({ type, id }) }, { expectedUserId }),
  recentSearches: () => request<{ items: MobileRecentSearch[] }>("/api/mobile/v1/recent-searches"),
  createRecentSearch: (input: CreateMobileRecentSearch) => request<{ item: MobileRecentSearch }>("/api/mobile/v1/recent-searches", { method: "POST", body: JSON.stringify(input) }),
  deleteRecentSearch: (id: string) => request<{ success: true }>("/api/mobile/v1/recent-searches", { method: "DELETE", body: JSON.stringify({ id }) }),
  clearRecentSearches: () => request<{ success: true }>("/api/mobile/v1/recent-searches?clear=all", { method: "DELETE" }),
  priceAlerts: () => request<{ alerts: MobilePriceAlert[] }>("/api/mobile/v1/price-alerts"),
  createPriceAlert: (body: CreateFlightPriceAlert | CreateHotelPriceAlert | CreateCarPriceAlert, journeyRequestId?: string | null) => request<{ alert: MobilePriceAlert }>("/api/mobile/v1/price-alerts", { method: "POST", body: JSON.stringify({ ...body, ...(journeyRequestId ? { journeyRequestId } : {}) }) }),
  updatePriceAlertStatus: (id: string, status: "ACTIVE" | "PAUSED") => request<{ alert: MobilePriceAlert }>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deletePriceAlert: (id: string) => request<{ deleted: true; id: string }>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notifications: (cursor?: string) => request<MobileNotificationPage>(`/api/mobile/v1/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  notificationUnreadCount: () => request<{ count: number }>("/api/mobile/v1/notifications/unread-count"),
  markNotificationRead: (id: string) => request<{ notification: MobileNotification; changed: boolean }>(`/api/mobile/v1/notifications/${encodeURIComponent(id)}`, { method: "PATCH" }),
  deleteNotification: (id: string) => request<{ deleted: true; changed: boolean }>(`/api/mobile/v1/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }),
  markAllNotificationsRead: () => request<{ updated: number }>("/api/mobile/v1/notifications", { method: "PATCH" }),
  location: () => request<MobileLocation>("/api/location"),
  currencyRates: () => request<CurrencyRates>("/api/currency/rates"),
  exploreCatalogue: fetchExploreCatalogue,
};
