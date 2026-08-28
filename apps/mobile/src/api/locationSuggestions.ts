import { getApiBaseUrl } from "../config/apiUrl";
import type { CarLocationSuggestion } from "../../../../src/lib/cars/carLocationSuggestions";

export type FlightPlaceSuggestion = {
  code: string;
  airport: string;
  city: string;
  country?: string;
  type: "airport" | "city";
};
type Fetcher = typeof fetch;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseFlightPlaceSuggestions(
  value: unknown,
): FlightPlaceSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions))
    throw new Error("Invalid airport search response.");
  const seen = new Set<string>();
  const suggestions: FlightPlaceSuggestion[] = [];
  for (const candidate of value.suggestions) {
    if (!isRecord(candidate)) continue;
    const code =
      typeof candidate.code === "string"
        ? candidate.code.trim().toUpperCase()
        : "";
    const airport =
      typeof candidate.airport === "string" ? candidate.airport.trim() : "";
    const city =
      typeof candidate.city === "string" ? candidate.city.trim() : "";
    const country =
      typeof candidate.country === "string" ? candidate.country.trim() : "";
    const type = candidate.type;
    if (!/^[A-Z]{3}$/.test(code) || !airport || !city || (type !== "airport" && type !== "city") || seen.has(code))
      continue;
    seen.add(code);
    suggestions.push(
      country ? { code, airport, city, country, type } : { code, airport, city, type },
    );
    if (suggestions.length === 8) break;
  }
  return suggestions;
}

export function parseCarLocationSuggestions(
  value: unknown,
): CarLocationSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions))
    throw new Error("Invalid car location response.");
  const seen = new Set<string>();
  const suggestions: CarLocationSuggestion[] = [];
  for (const candidate of value.suggestions) {
    if (!isRecord(candidate)) continue;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const kind = candidate.kind;
    const locationValue =
      typeof candidate.value === "string" ? candidate.value.trim() : "";
    const primaryText =
      typeof candidate.primaryText === "string"
        ? candidate.primaryText.trim()
        : "";
    const secondaryText =
      typeof candidate.secondaryText === "string"
        ? candidate.secondaryText.trim()
        : "";
    if (
      !id ||
      !["airport", "city", "area"].includes(String(kind)) ||
      !locationValue ||
      !primaryText ||
      !secondaryText ||
      seen.has(`${kind}:${locationValue.toLowerCase()}`)
    )
      continue;
    seen.add(`${kind}:${locationValue.toLowerCase()}`);
    suggestions.push({
      id,
      kind: kind as "airport" | "city" | "area",
      value: locationValue,
      primaryText,
      secondaryText,
      ...(typeof candidate.city === "string" && candidate.city.trim()
        ? { city: candidate.city.trim() }
        : {}),
      ...(typeof candidate.countryCode === "string" &&
      /^[A-Z]{2}$/.test(candidate.countryCode.trim().toUpperCase())
        ? { countryCode: candidate.countryCode.trim().toUpperCase() }
        : {}),
      ...(typeof candidate.airportCode === "string" &&
      /^[A-Z]{3}$/.test(candidate.airportCode.trim().toUpperCase())
        ? { airportCode: candidate.airportCode.trim().toUpperCase() }
        : {}),
    });
    if (suggestions.length === 8) break;
  }
  return suggestions;
}

async function getJson(
  path: string,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  const base = getApiBaseUrl();
  if (!base.ok) throw new Error(base.message);
  const response = await fetcher(`${base.baseUrl}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Location search unavailable.");
  return response.json() as Promise<unknown>;
}

export async function searchFlightPlaces(
  query: string,
  options: {
    context: "origin" | "destination";
    signal?: AbortSignal;
    fetcher?: Fetcher;
  },
): Promise<FlightPlaceSuggestion[]> {
  const params = new URLSearchParams({
    context: options.context,
    q: query.trim(),
  });
  return parseFlightPlaceSuggestions(
    await getJson(
      `/api/flights/places?${params}`,
      options.signal,
      options.fetcher,
    ),
  );
}

export async function searchCarLocations(
  query: string,
  options: {
    signal?: AbortSignal;
    country?: string;
    limit?: number;
    fetcher?: Fetcher;
  } = {},
): Promise<CarLocationSuggestion[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(options.limit ?? 8),
  });
  if (options.country) params.set("country", options.country);
  return parseCarLocationSuggestions(
    await getJson(
      `/api/cars/locations?${params}`,
      options.signal,
      options.fetcher,
    ),
  );
}
