import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { Platform } from "react-native";
import type { NormalizedCarResult } from "../../../../src/lib/cars/types";
import type { PublicFlightResult, PublicHotelResult } from "../../../../src/lib/types";
import type { ContractResult, TravelSearchResponse } from "../../../../src/lib/travel/searchContract";
import { parseMobileExploreCatalogue, type MobileExploreCatalogue } from "./exploreCatalogueContract";
import { responseByteLength } from "../features/search/flightSearchDiagnostics";

export class TravelApiError extends Error {
  constructor(message: string, public status = 0, public code: "cancelled" | "timeout" | "configuration" | "validation" | "rate-limit" | "unavailable" | "server" | "network" | "invalid-response" = "network", public details?: Record<string, unknown>) { super(message); }
}

export type FlightResult = ContractResult<PublicFlightResult>;
export type HotelResult = ContractResult<PublicHotelResult>;
export type CarResult = ContractResult<NormalizedCarResult>;
export type MobileTrip = { id: string; providerConfirmationCode: string; providerName: string; tripType: string; status: "upcoming" | "past" | "cancelled"; origin: string | null; destination: string; departureDate: string; returnDate: string | null; travelerCount: number; currency: string; totalAmount: number | null; providerAction: { url: string; label: string; external: true } | null };
export type MobileProfile = { fullName?: string | null; phoneNumber?: string | null; phoneCountryCode?: string | null; dateOfBirth?: string | null; gender?: string | null; nationality?: string | null; address?: string | null };
export type MobilePriceAlertStatus = "ACTIVE" | "PAUSED" | "TRIGGERED" | "EXPIRED";
export type MobilePriceAlert = { id: string; type: "FLIGHT" | "HOTEL"; origin: string | null; destination: string; targetPrice: string | null; currency: string | null; status: MobilePriceAlertStatus; createdAt: string; updatedAt: string; lastSeenPrice: string | null; lastCheckedAt: string | null; query: Record<string, unknown> };
export type CreateFlightPriceAlert = { type: "FLIGHT"; origin: string; destination: string; targetPrice: number; currency: string; query: Record<string, unknown> };
export type CurrencyRates = { base: string; rates: Record<string, number>; fetchedAt: string; source: string; stale?: boolean };
export type MobileLocation = { source: "ipinfo-lite" | "fallback"; countryCode: string | null; country: string | null; continentCode: string | null; continent: string | null; ipDetected: boolean };
export type MobileNotificationType = "PRICE_ALERT" | "SUPPORT_UPDATE" | "ACCOUNT_UPDATE" | "SECURITY_UPDATE" | "SYSTEM" | "TRAVEL_INSIGHT";
export type MobileNotification = { id: string; type: MobileNotificationType; title: string; body: string; actionPath: "/price-alerts" | "/saved" | "/settings" | "/personal-information" | "/support" | null; metadata: Record<string, unknown> | null; readAt: string | null; createdAt: string };
export type MobileNotificationPage = { items: MobileNotification[]; nextCursor: string | null };
export type CustomizationPreferences = { locale: string; currency: string; region: string; personalizeRecommendations: boolean };
export type SupportCategory = "search-help" | "price-alerts" | "redirect" | "account";
export type SupportTicketInput = { email: string; subject: string; category: SupportCategory; body: string; sourceContext?: { page: "mobile_support"; platform: "ios" | "android" } };
export type EmailPreferences = { receiveOptionalEmails: boolean; priceAlerts: boolean; travelInspiration: boolean; productUpdates: boolean; dealsRecommendations: boolean };
export type TravelPreferences = { homeAirport: string; preferredAirlines: string[]; notificationPreferences: { emailUpdates: boolean; priceAlertEmails: boolean; travelInspirationEmails: boolean } };
export type TravelPreferencesPatch = Partial<Pick<TravelPreferences, "homeAirport" | "preferredAirlines">>;
export type MobileSavedItem = { id: string; type: "flight" | "hotel" | "search"; [key: string]: unknown };
export type CreateMobileSavedItem = { type: "flight" | "hotel" | "search"; [key: string]: unknown };
export type MobileRecentSearch = { id: string; type: "flight" | "hotel"; label: string; subtitle: string; href: string; params: unknown; createdAt: string; updatedAt: string };
export type CreateMobileRecentSearch = Omit<MobileRecentSearch, "createdAt" | "updatedAt">;
export type FeatureAvailability = { flightSearch: boolean; hotelSearch: boolean; carSearch: boolean; deals: boolean; priceAlerts: boolean };
export type HotelDestinationKind = "city" | "district" | "landmark" | "airport-area";
export type HotelDestinationSuggestion = { id: string; name: string; country: string; countryCode: string; region?: string; kind: HotelDestinationKind; searchValue: string; aliases?: string[] };
export const FLIGHT_SEARCH_REQUEST_TIMEOUT_MS = 14_000;

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
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Mobile-Platform": Platform.OS,
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.requestId ? { "X-Search-Request-Id": options.requestId } : {}),
        ...init.headers,
      },
    });
    const textStartedAt = performance.now();
    const raw = await response.text();
    const textDecodeMs = performance.now() - textStartedAt;
    let data: Record<string, unknown>;
    const parseStartedAt = performance.now();
    try { data = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { throw new TravelApiError("The search provider returned an invalid response.", response.status, "invalid-response"); }
    const jsonParseMs = performance.now() - parseStartedAt;
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
        responseBytes: responseByteLength(raw),
        textDecodeMs,
        jsonParseMs,
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
  searchFlights: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<PublicFlightResult>>("/api/flights/search", { method: "POST", body: JSON.stringify(body) }, { ...options, timeoutMs: FLIGHT_SEARCH_REQUEST_TIMEOUT_MS }),
  searchHotels: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<PublicHotelResult>>("/api/hotels/search", { method: "POST", body: JSON.stringify(body) }, options),
  searchHotelDestinations: (query: string, options: { signal?: AbortSignal; countryCode?: string; locale?: string; limit?: number } = {}) => {
    const params = new URLSearchParams({ q: query.trim(), limit: String(options.limit ?? 8) });
    if (options.countryCode) params.set("countryCode", options.countryCode);
    if (options.locale) params.set("locale", options.locale);
    return request<{ suggestions?: HotelDestinationSuggestion[] }>(`/api/hotels/destinations?${params.toString()}`, {}, { signal: options.signal });
  },
  searchCars: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<NormalizedCarResult>>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }, options),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
  updateProfile: (profile: MobileProfile) => request<{ profile: MobileProfile }>("/api/mobile/v1/profile", { method: "PATCH", body: JSON.stringify(profile) }),
  customizationPreferences: () => request<{ hasPreferences: boolean; preferences: CustomizationPreferences }>("/api/mobile/v1/customization-preferences"),
  updateCustomizationPreferences: (preferences: Partial<CustomizationPreferences>) => request<{ preferences: CustomizationPreferences }>("/api/mobile/v1/customization-preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  createSupportTicket: (input: SupportTicketInput) => request<{ ticket: { id: string; subject: string } }>("/api/mobile/v1/support/tickets", { method: "POST", body: JSON.stringify(input) }),
  emailPreferences: () => request<{ hasPreferences: boolean; preferences: EmailPreferences }>("/api/mobile/v1/email-preferences"),
  updateEmailPreferences: (preferences: EmailPreferences) => request<{ preferences: EmailPreferences }>("/api/mobile/v1/email-preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  travelPreferences: () => request<{ hasPreferences: boolean; preferences: TravelPreferences }>("/api/mobile/v1/travel-preferences"),
  updateTravelPreferences: (preferences: TravelPreferencesPatch) => request<{ preferences: TravelPreferences }>("/api/mobile/v1/travel-preferences", { method: "PATCH", body: JSON.stringify(preferences) }),
  savedItems: () => request<{ items: MobileSavedItem[]; summary: Record<string, number> }>("/api/mobile/v1/saved"),
  createSavedItem: (input: CreateMobileSavedItem) => request<{ item: MobileSavedItem }>("/api/mobile/v1/saved", { method: "POST", body: JSON.stringify(input) }),
  deleteSavedItem: (type: MobileSavedItem["type"], id: string) => request<{ success: true }>("/api/mobile/v1/saved", { method: "DELETE", body: JSON.stringify({ type, id }) }),
  recentSearches: () => request<{ items: MobileRecentSearch[] }>("/api/mobile/v1/recent-searches"),
  createRecentSearch: (input: CreateMobileRecentSearch) => request<{ item: MobileRecentSearch }>("/api/mobile/v1/recent-searches", { method: "POST", body: JSON.stringify(input) }),
  deleteRecentSearch: (id: string) => request<{ success: true }>("/api/mobile/v1/recent-searches", { method: "DELETE", body: JSON.stringify({ id }) }),
  clearRecentSearches: () => request<{ success: true }>("/api/mobile/v1/recent-searches?clear=all", { method: "DELETE" }),
  priceAlerts: () => request<{ alerts: MobilePriceAlert[] }>("/api/mobile/v1/price-alerts"),
  createPriceAlert: (body: CreateFlightPriceAlert) => request<{ alert: MobilePriceAlert }>("/api/mobile/v1/price-alerts", { method: "POST", body: JSON.stringify(body) }),
  updatePriceAlertStatus: (id: string, status: "ACTIVE" | "PAUSED") => request<{ alert: MobilePriceAlert }>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deletePriceAlert: (id: string) => request<{ deleted: true; id: string }>(`/api/mobile/v1/price-alerts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notifications: (cursor?: string) => request<MobileNotificationPage>(`/api/mobile/v1/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  notificationUnreadCount: () => request<{ count: number }>("/api/mobile/v1/notifications/unread-count"),
  markNotificationRead: (id: string) => request<{ notification: MobileNotification; changed: boolean }>(`/api/mobile/v1/notifications/${encodeURIComponent(id)}`, { method: "PATCH" }),
  markAllNotificationsRead: () => request<{ updated: number }>("/api/mobile/v1/notifications", { method: "PATCH" }),
  location: () => request<MobileLocation>("/api/location"),
  currencyRates: () => request<CurrencyRates>("/api/currency/rates"),
  exploreCatalogue: fetchExploreCatalogue,
};
