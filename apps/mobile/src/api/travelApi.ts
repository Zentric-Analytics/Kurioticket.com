import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { Platform } from "react-native";
import type { NormalizedCarResult } from "../../../../src/lib/cars/types";
import type { PublicFlightResult, PublicHotelResult } from "../../../../src/lib/types";
import type { ContractResult, TravelSearchResponse } from "../../../../src/lib/travel/searchContract";
import { parseMobileExploreCatalogue, type MobileExploreCatalogue } from "./exploreCatalogueContract";

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
export type MobileNotification = { id: string; type: MobileNotificationType; title: string; body: string; actionPath: "/price-alerts" | "/saved" | "/settings" | "/personal-information" | null; metadata: Record<string, unknown> | null; readAt: string | null; createdAt: string };
export type MobileNotificationPage = { items: MobileNotification[]; nextCursor: string | null };
export type FeatureAvailability = { flightSearch: boolean; hotelSearch: boolean; carSearch: boolean; deals: boolean; priceAlerts: boolean };
export const FLIGHT_SEARCH_REQUEST_TIMEOUT_MS = 22_000;

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
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.requestId ? { "X-Search-Request-Id": options.requestId } : {}),
        ...init.headers,
      },
    });
    const raw = await response.text();
    let data: Record<string, unknown>;
    try { data = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { throw new TravelApiError("The search provider returned an invalid response.", response.status, "invalid-response"); }
    if (!response.ok) {
      const code = response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status === 503 ? "unavailable" : response.status >= 500 ? "server" : "network";
      throw new TravelApiError(apiErrorMessage(data), response.status, code, data);
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
  searchCars: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<TravelSearchResponse<NormalizedCarResult>>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }, options),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
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
