import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type { NormalizedCarResult } from "../../../../src/lib/cars/types";
import type { PublicFlightResult, PublicHotelPropertyDetails, PublicHotelResult } from "../../../../src/lib/types";
import type { PublicHotelProviderDetails } from "../../../../src/lib/hotels/hotelProviderDetails";
import type { HotelRoomOption } from "../../../../src/lib/hotels/hotelRoomOptions";
import type { ContractResult, TravelSearchResponse } from "../../../../src/lib/travel/searchContract";
import type { FlightDetailsResponse } from "../../../../src/lib/flights/flightDetailsContract";
import { parseMobileExploreCatalogue, type MobileExploreCatalogue } from "./exploreCatalogueContract";
import { logFlightSearchCheckpoint } from "../features/search/flightSearchDiagnostics";

export class TravelApiError extends Error {
  constructor(message: string, public status = 0, public code: "cancelled" | "timeout" | "configuration" | "validation" | "rate-limit" | "unavailable" | "server" | "network" | "invalid-response" = "network", public details?: Record<string, unknown>) { super(message); }
}

export type FlightResult = ContractResult<PublicFlightResult>;
export type MobileFlightDetailsResponse = FlightDetailsResponse;
export type FlightRedirectResponse = { url: string };
export type HotelResult = ContractResult<PublicHotelResult>;
export type HotelSearchResponse = TravelSearchResponse<PublicHotelResult> & {
  warningCategory?: "provider_unavailable" | string;
};
export type MobileHotelDetailsResponse = { hotel: PublicHotelResult; propertyDetails: PublicHotelPropertyDetails | null; providerDetails: PublicHotelProviderDetails | null; roomOptions: HotelRoomOption[]; relatedHotels: PublicHotelResult[] };
export type MobileHotelDetailsRequest = { id: string; checkIn: string; checkOut: string; guests: number; rooms: number };
export type CarResult = ContractResult<NormalizedCarResult>;
export type PackageComponent = { status: "success" | "empty" | "unavailable"; results: (FlightResult | HotelResult | CarResult)[]; warnings: string[]; source: string; requestId: string };
export type PackageSearchResponse = { mode: string; status: "success" | "partial" | "empty" | "unavailable"; components: Partial<Record<"flight" | "hotel" | "car", PackageComponent>>; packageOffers: unknown[] };
export type MobileTrip = { id: string; providerConfirmationCode: string; providerName: string; tripType: string; status: "upcoming" | "past" | "cancelled"; origin: string | null; destination: string; departureDate: string; returnDate: string | null; travelerCount: number; currency: string; totalAmount: number | null; providerAction: { url: string; label: string; external: true } | null };
export type MobileProfile = { fullName?: string | null; phoneNumber?: string | null; phoneCountryCode?: string | null; dateOfBirth?: string | null; gender?: string | null; nationality?: string | null; address?: string | null };
export type MobilePriceAlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED";
export type MobilePriceAlert = { id: string; type: "FLIGHT" | "HOTEL" | "CAR"; origin: string | null; destination: string; targetPrice: string | null; currency: string | null; status: MobilePriceAlertStatus; createdAt: string; updatedAt: string; lastSeenPrice: string | null; lastCheckedAt: string | null; query: Record<string, unknown> };
export type CreateFlightPriceAlert = { type: "FLIGHT"; origin: string; destination: string; targetPrice: number; currency: string; query: Record<string, unknown> };
export type CreateHotelPriceAlert = { type: "HOTEL"; destination: string; targetPrice: number; mode: "TARGET"; currency: string; query: Record<string, unknown> };
export type CreateCarPriceAlert = { type: "CAR"; origin: string; destination: string; targetPrice: number; mode: "TARGET"; currency: string; query: Record<string, unknown> };
export type CurrencyRates = { base: string; rates: Record<string, number>; fetchedAt: string; source: string; stale?: boolean };
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
export type HotelDestinationKind = "city" | "district" | "landmark" | "airport-area";
export type HotelDestinationSuggestion = { id: string; name: string; country: string; countryCode: string; region?: string; kind: HotelDestinationKind; searchValue: string; aliases?: string[] };
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

async function request<T>(path: string, init: RequestInit = {}, options: { signal?: AbortSignal; timeoutMs?: number; requestId?: string } = {}) {
  const requestStartedAt = Date.now();
  const base = getApiBaseUrl(Platform.OS, __DEV__);
  if (!base.ok) throw new TravelApiError(base.message, 0, "configuration");
  const session = await readSession().catch(() => null);
  const controller = new AbortController();
  const onAbort = () => controller.abort("cancelled");
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort("timeout"), options.timeoutMs ?? 20000);
  try {
    const response = await fetch(`${base.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}), ...(init.headers || {}) },
    });
    const responseStartedAt = Date.now();
    const data = await response.json().catch(() => ({}));
    const responseJsonMs = Date.now() - responseStartedAt;
    if (!response.ok) {
      const code = response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status === 503 ? "unavailable" : response.status >= 500 ? "server" : "network";
      throw new TravelApiError(apiErrorMessage(data), response.status, code, data);
    }
    if (path === "/api/flights/search") {
      const mobileRoundTripMs = Date.now() - requestStartedAt;
      data.mobileRoundTripMs = mobileRoundTripMs;
      console.info("[flight-search:mobile-performance]", {
        requestId: options.requestId,
        mobileRoundTripMs,
        responseBytes: response.headers.get("content-length"),
        responseJsonMs,
        resultCount: Array.isArray(data.results) ? data.results.length : undefined,
        server: data.performance,
      });
    }
    return data as T;
  } catch (error) {
    if (error instanceof TravelApiError) throw error;
    if (controller.signal.aborted) {
      const cancelled = options.signal?.aborted;
      throw new TravelApiError(cancelled ? "Search cancelled." : "The search took too long. Please try again.", 0, cancelled ? "cancelled" : "timeout");
    }
    throw new TravelApiError("The search service could not be reached. Check your connection and try again.", 0, "network");
  } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", onAbort); }
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
  searchFlights: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<PublicFlightResult>>("/api/flights/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  flightDetails: (id: string, options: { signal?: AbortSignal } = {}) => request<FlightDetailsResponse>(`/api/flights/details?id=${encodeURIComponent(id)}`, {}, options),
  flightRedirect: (id: string, options: { signal?: AbortSignal; sourcePage?: string } = {}) => request<FlightRedirectResponse>("/api/redirect", { method: "POST", body: JSON.stringify({ id, type: "flight", sourcePage: options.sourcePage ?? "native_flight_details" }) }, { signal: options.signal }),
  searchHotels: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<HotelSearchResponse>("/api/hotels/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  hotelDetails: (input: MobileHotelDetailsRequest, options: { signal?: AbortSignal } = {}) => {
    const params = new URLSearchParams({ id: input.id, checkIn: input.checkIn, checkOut: input.checkOut, guests: String(input.guests), rooms: String(input.rooms) });
    return request<MobileHotelDetailsResponse>(`/api/hotels/details?${params.toString()}`, {}, options);
  },
  searchHotelDestinations: (query: string, options: { signal?: AbortSignal; countryCode?: string; locale?: string; limit?: number } = {}) => {
    const params = new URLSearchParams({ q: query.trim(), limit: String(options.limit ?? 8) });
    if (options.countryCode) params.set("countryCode", options.countryCode);
    if (options.locale) params.set("locale", options.locale);
    return request<{ suggestions?: HotelDestinationSuggestion[] }>(`/api/hotels/destinations?${params.toString()}`, {}, { signal: options.signal });
  },
  searchCars: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<NormalizedCarResult>>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: METASEARCH_REQUEST_TIMEOUT_MS }),
  searchPackages: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<PackageSearchResponse>("/api/packages/search", { method: "POST", body: JSON.stringify(body) }, options),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
  securityOverview: () => request<{ overview: SecurityOverview }>("/api/mobile/v1/security/overview"),
  passkeys: () => request<{passkeys:MobilePasskey[]}>("/api/mobile/v1/security/passkeys"),
  passkeyReauth: (body:{action?:"send-email-code"|"verify";purpose:"setup"|"removal";code?:string;password?:string}) => request<{ok?:true;method:string;purpose:string;reauthToken?:string;expiresAt?:string}>("/api/mobile/v1/security/passkeys/reauth",{method:"POST",body:JSON.stringify({reauthToken:undefined,...body})}),
  passkeyRegistrationOptions: (reauthToken:string) => request<{options:PasskeyRegistrationOptions}>("/api/mobile/v1/security/passkeys/register/options",{method:"POST",body:JSON.stringify({reauthToken})}),
  verifyPasskeyRegistration: (body:{name:string;response:Record<string,unknown>}) => request<{ok:true}>("/api/mobile/v1/security/passkeys/register/verify",{method:"POST",body:JSON.stringify(body)}),
  renamePasskey: (id:string,name:string) => request<{ok:true}>(`/api/mobile/v1/security/passkeys/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({name})}),
  removePasskey: (id:string,reauthToken:string) => request<{ok:true}>(`/api/mobile/v1/security/passkeys/${encodeURIComponent(id)}`,{method:"DELETE",body:JSON.stringify({reauthToken})}),
  securitySessions: () => request<{sessions:SecuritySession[]}>("/api/mobile/v1/security/sessions"),
  revokeSecuritySession: (id:string) => request<{ok:true}>(`/api/mobile/v1/security/sessions/${encodeURIComponent(id)}`,{method:"DELETE"}),
  revokeOtherSecuritySessions: () => request<{ok:true}>("/api/mobile/v1/security/sessions/revoke-others",{method:"POST"}),
  twoFactorStatus: () => request<{status:TwoFactorStatus}>("/api/mobile/v1/security/two-factor"),
  twoFactorSetup: () => request<TwoFactorSetup>("/api/mobile/v1/security/two-factor/setup",{method:"POST"}),
  twoFactorEnable: (code:string) => request<{ok:true;recoveryCodes:string[]}>("/api/mobile/v1/security/two-factor/enable",{method:"POST",body:JSON.stringify({code})}),
  twoFactorDisable: (code:string) => request<{ok:true}>("/api/mobile/v1/security/two-factor/disable",{method:"POST",body:JSON.stringify({code})}),
  accountDeletion: () => request<{request:AccountDeletionRequest|null}>("/api/mobile/v1/account-deletion"),
  requestAccountDeletion: () => request<{request:AccountDeletionRequest}>("/api/mobile/v1/account-deletion",{method:"POST"}),
  cancelAccountDeletion: () => request<{request:AccountDeletionRequest}>("/api/mobile/v1/account-deletion/cancel",{method:"POST"}),
  location: () => request<MobileLocation>("/api/mobile/v1/location"),
  currencyRates: () => request<CurrencyRates>("/api/mobile/v1/currency/rates"),
  notifications: (options:{limit?:number;cursor?:string}={}) => { const p=new URLSearchParams(); if(options.limit)p.set("limit",String(options.limit)); if(options.cursor)p.set("cursor",options.cursor); return request<MobileNotificationPage>(`/api/mobile/v1/notifications${p.toString()?`?${p.toString()}`:""}`); },
  markNotificationRead: (id:string) => request<{ok:true}>(`/api/mobile/v1/notifications/${encodeURIComponent(id)}/read`,{method:"POST"}),
  markAllNotificationsRead: () => request<{ok:true}>("/api/mobile/v1/notifications/read-all",{method:"POST"}),
  priceAlerts: () => request<{alerts:MobilePriceAlert[]}>("/api/mobile/v1/price-alerts"),
  createPriceAlert: (body:CreateFlightPriceAlert|CreateHotelPriceAlert|CreateCarPriceAlert) => request<{alert:MobilePriceAlert}>("/api/mobile/v1/price-alerts",{method:"POST",body:JSON.stringify(body)}),
  updatePriceAlert: (id:string,body:{status:MobilePriceAlertStatus}) => request<{alert:MobilePriceAlert}>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(body)}),
  deletePriceAlert: (id:string) => request<{ok:true}>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`,{method:"DELETE"}),
  recentSearches: (limit=50) => request<{items:MobileRecentSearch[]}>(`/api/mobile/v1/recent-searches?limit=${encodeURIComponent(String(limit))}`),
  createRecentSearch: (body:CreateMobileRecentSearch) => request<{item:MobileRecentSearch}>("/api/mobile/v1/recent-searches",{method:"POST",body:JSON.stringify(body)}),
  deleteRecentSearch: (id:string) => request<{ok:true}>(`/api/mobile/v1/recent-searches/${encodeURIComponent(id)}`,{method:"DELETE"}),
  clearRecentSearches: () => request<{ok:true}>("/api/mobile/v1/recent-searches",{method:"DELETE"}),
  support: (body:SupportTicketInput) => request<{ok:true}>("/api/mobile/v1/support",{method:"POST",body:JSON.stringify(body)}),
  emailPreferences: () => request<{preferences:EmailPreferences}>("/api/mobile/v1/preferences/email"),
  updateEmailPreferences: (body:Partial<EmailPreferences>) => request<{preferences:EmailPreferences}>("/api/mobile/v1/preferences/email",{method:"PATCH",body:JSON.stringify(body)}),
  travelPreferences: () => request<{preferences:TravelPreferences}>("/api/mobile/v1/preferences/travel"),
  updateTravelPreferences: (body:TravelPreferencesPatch) => request<{preferences:TravelPreferences}>("/api/mobile/v1/preferences/travel",{method:"PATCH",body:JSON.stringify(body)}),
  customizationPreferences: () => request<{preferences:CustomizationPreferences}>("/api/mobile/v1/preferences/customization"),
  updateCustomizationPreferences: (body:Partial<CustomizationPreferences>) => request<{preferences:CustomizationPreferences}>("/api/mobile/v1/preferences/customization",{method:"PATCH",body:JSON.stringify(body)}),
};