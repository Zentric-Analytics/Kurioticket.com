import { getApiBaseUrl } from "../config/apiUrl";
import { readSession } from "../storage/sessionStorage";

export class TravelApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
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

async function request<T>(path: string, init: RequestInit = {}) {
  const base = getApiBaseUrl();
  if (!base.ok) throw new TravelApiError(base.message);
  const session = await readSession().catch(() => null);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${base.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...init.headers,
      },
    });
    const data = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new TravelApiError(data.error || "Kurioticket could not complete this request.", response.status);
    return data as T;
  } catch (error) {
    if (error instanceof TravelApiError) throw error;
    throw new TravelApiError("Check your connection and try again.");
  } finally { clearTimeout(timeout); }
}

export const travelApi = {
  searchFlights: (body: Record<string, unknown>) => request<{ results: FlightResult[]; warnings?: string[] }>("/api/flights/search", { method: "POST", body: JSON.stringify(body) }),
  searchHotels: (body: Record<string, unknown>) => request<{ results: HotelResult[]; warnings?: string[] }>("/api/hotels/search", { method: "POST", body: JSON.stringify(body) }),
  searchCars: (body: Record<string, unknown>) => request<{ results: CarResult[]; mode: string; status: string }>("/api/cars/search", { method: "POST", body: JSON.stringify(body) }),
  trips: (status?: "upcoming" | "past" | "cancelled") => request<{ trips: MobileTrip[]; summary: Record<string, number> }>(`/api/mobile/v1/trips${status ? `?status=${status}` : ""}`),
  trip: (id: string) => request<{ trip: MobileTrip }>(`/api/mobile/v1/trips/${encodeURIComponent(id)}`),
  profile: () => request<{ profile: MobileProfile | null; user: { id: string; email: string; name?: string | null } }>("/api/mobile/v1/profile"),
  priceAlerts: () => request<{ alerts: MobilePriceAlert[] }>("/api/mobile/v1/price-alerts"),
  currencyRates: () => request<CurrencyRates>("/api/currency/rates"),
};
