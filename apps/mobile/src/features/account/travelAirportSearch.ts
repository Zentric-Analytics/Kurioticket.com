import { getApiBaseUrl } from "../../config/apiUrl";

export type TravelAirportSuggestion = {
  code: string;
  airport: string;
  city: string;
  country: string;
};

type Fetcher = typeof fetch;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseTravelAirportSuggestions(value: unknown): TravelAirportSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) {
    throw new Error("Invalid airport search response.");
  }

  const seen = new Set<string>();
  const suggestions: TravelAirportSuggestion[] = [];
  for (const candidate of value.suggestions) {
    if (!isRecord(candidate)) continue;
    const code = typeof candidate.code === "string" ? candidate.code.trim().toUpperCase() : "";
    const airport = typeof candidate.airport === "string" ? candidate.airport.trim() : "";
    const city = typeof candidate.city === "string" ? candidate.city.trim() : "";
    const country = typeof candidate.country === "string" ? candidate.country.trim() : "";
    if (!/^[A-Z]{3}$/.test(code) || !airport || !city || !country || seen.has(code)) continue;
    seen.add(code);
    suggestions.push({ code, airport, city, country });
    if (suggestions.length === 8) break;
  }
  return suggestions;
}

export async function searchTravelAirports(
  query: string,
  options: { signal?: AbortSignal; fetcher?: Fetcher } = {},
): Promise<TravelAirportSuggestion[]> {
  const base = getApiBaseUrl();
  if (!base.ok) throw new Error(base.message);
  const params = new URLSearchParams({ context: "origin", q: query.trim() });
  const response = await (options.fetcher ?? fetch)(
    `${base.baseUrl}/api/flights/places?${params.toString()}`,
    { method: "GET", headers: { Accept: "application/json" }, signal: options.signal },
  );
  if (!response.ok) throw new Error("Airport search unavailable.");
  return parseTravelAirportSuggestions(await response.json());
}
