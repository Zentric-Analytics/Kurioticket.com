import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";
import { Platform } from "react-native";

export class TravelApiError extends Error {
  constructor(message: string, public status = 0, public code: "cancelled" | "timeout" | "configuration" | "validation" | "rate-limit" | "unavailable" | "server" | "network" | "invalid-response" = "network") { super(message); }
}

export type FlightResult = {
  id: string; provider: string; airlineName: string; flightNumber?: string;
  originAirport: string; destinationAirport: string; departureTime: string; arrivalTime: string;
  duration: string; stops: number; cabinClass: string; baggageInfo: string;
  price: number; currency: string; bookingUrl: string; partnerRedirectUrl: string;
  badges: string[]; recommendationReasons: string[];
};
export type HotelResult = {
  id: string; provider: string; name: string; imageUrl?: string; rating: number;
  reviewScore?: number; reviewScale?: 5 | 10; location: string; neighbourhood?: string;
  amenities: string[]; roomType: string; cancellationInfo: string; inventoryKind?: "bookable" | "discovery";
  pricePerNight?: number; totalPrice?: number; currency?: string; bookingUrl?: string; partnerRedirectUrl?: string;
  badges: string[];
};
export type CarOffer = { id: string; bookingProviderName: string; rentalCompanyName: string; currency: string; pricePerDay: number; totalPrice: number; bookingUrl?: string; freeCancellation: boolean };
export type CarResult = {
  id: string; categoryLabel: string; modelName: string; imageUrl?: string; passengers: number;
  bags: number; transmission: string; airConditioning: boolean; pickupLocation: string;
  rentalCompanyName: string; offers: CarOffer[]; isDemo: boolean;
};
export type MobileTrip = { id: string; bookingReference: string; provider: string; tripType: string; status: "upcoming" | "past" | "cancelled"; origin: string | null; destination: string; departureDate: string; returnDate: string | null; passengerCount: number; currency: string; totalAmount: number | null };
export type MobileProfile = { fullName?: string | null; phoneNumber?: string | null; phoneCountryCode?: string | null; dateOfBirth?: string | null; gender?: string | null; nationality?: string | null; address?: string | null };
export type MobilePriceAlert = { id: string; type: "FLIGHT" | "HOTEL"; origin: string | null; destination: string; targetPrice: string | null; currency: string | null; status: string; updatedAt: string };
export type CurrencyRates = { base: string; rates: Record<string, number>; fetchedAt: string; source: string; stale?: boolean };

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
    let data: { error?: string };
    try { data = raw ? JSON.parse(raw) as { error?: string } : {}; } catch { throw new TravelApiError("The search provider returned an invalid response.", response.status, "invalid-response"); }
    if (!response.ok) {
      const code = response.status === 400 ? "validation" : response.status === 429 ? "rate-limit" : response.status === 503 ? "unavailable" : response.status >= 500 ? "server" : "network";
      throw new TravelApiError(data.error || "Kurioticket could not complete this request.", response.status, code);
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

export const travelApi = {
  searchFlights: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<{ results: FlightResult[]; warnings?: string[] }>("/api/flights/search", { method: "POST", body: JSON.stringify(body) }, options),
  searchHotels: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<{ results: HotelResult[]; warnings?: string[] }>("/api/hotels/search", { method: "POST", body: JSON.stringify(body) }, options),
  searchCars: (body: Record<string, unknown>, options?: { signal?: AbortSignal; requestId?: string }) => request<{ results: CarResult[]; mode: string; status: string }>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }, options),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  trip: (id: string) => request<{ trip: MobileTrip }>(`/api/mobile/v1/trips/${encodeURIComponent(id)}`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
  priceAlerts: () => request<{ alerts: MobilePriceAlert[] }>("/api/mobile/v1/price-alerts"),
  currencyRates: () => request<CurrencyRates>("/api/currency/rates"),
};
