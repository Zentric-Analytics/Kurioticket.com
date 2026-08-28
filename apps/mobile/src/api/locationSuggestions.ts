import { getApiBaseUrl } from "../config/apiUrl";

export type FlightPlaceSuggestion = {
  code: string;
  city: string;
  airport: string;
  country: string;
  countryCode?: string;
  type: "airport" | "city";
  latitude?: number;
  longitude?: number;
};

export type CarLocationSuggestion = {
  id: string;
  kind: "airport" | "city" | "area";
  value: string;
  primaryText: string;
  secondaryText: string;
  city?: string;
  countryCode?: string;
  airportCode?: string;
  providerPlaceId?: string;
};

const apiUrl = (path: string) => {
  const configured = getApiBaseUrl();
  if (!configured.ok) throw new Error(configured.message);
  return `${configured.baseUrl}${path}`;
};

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export async function searchFlightPlaces(query: string, options: { context?: "origin" | "destination"; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ q: query.trim(), context: options.context ?? "destination" });
  const response = await fetch(apiUrl(`/api/flights/places?${params}`), { headers: { Accept: "application/json" }, signal: options.signal });
  if (!response.ok) throw new Error("Flight places could not be loaded.");
  const body: unknown = await response.json();
  if (!record(body) || !Array.isArray(body.suggestions)) return [];
  return body.suggestions.flatMap((item): FlightPlaceSuggestion[] => {
    if (!record(item) || typeof item.code !== "string" || typeof item.city !== "string" || typeof item.airport !== "string") return [];
    const type = item.type === "city" ? "city" : item.type === "airport" ? "airport" : undefined;
    if (!type || !/^[A-Z]{3}$/i.test(item.code)) return [];
    return [{ code: item.code.toUpperCase(), city: item.city, airport: item.airport, country: typeof item.country === "string" ? item.country : "", countryCode: typeof item.countryCode === "string" ? item.countryCode : undefined, type, latitude: typeof item.latitude === "number" ? item.latitude : undefined, longitude: typeof item.longitude === "number" ? item.longitude : undefined }];
  });
}

export async function searchCarLocations(query: string, options: { limit?: number; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams({ q: query.trim(), limit: String(options.limit ?? 8) });
  const response = await fetch(apiUrl(`/api/cars/locations?${params}`), { headers: { Accept: "application/json" }, signal: options.signal });
  if (!response.ok) throw new Error("Car locations could not be loaded.");
  const body: unknown = await response.json();
  if (!record(body) || !Array.isArray(body.suggestions)) return [];
  return body.suggestions.filter((item): item is CarLocationSuggestion => record(item)
    && typeof item.id === "string" && ["airport", "city", "area"].includes(String(item.kind))
    && typeof item.value === "string" && typeof item.primaryText === "string" && typeof item.secondaryText === "string");
}
