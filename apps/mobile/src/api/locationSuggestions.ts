import { getApiBaseUrl } from "../config/apiUrl";

type Fetcher = typeof fetch;
type RequestOptions = { signal?: AbortSignal; fetcher?: Fetcher };

export type FlightPlaceSuggestion = {
  code: string;
  airport: string;
  city: string;
  country?: string;
  type: "airport" | "city";
};

export type CarLocationSuggestion = {
  id: string;
  kind: "airport" | "city" | "area";
  value: string;
  primaryText: string;
  secondaryText: string;
  airportCode?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseFlightPlaceSuggestions(value: unknown): FlightPlaceSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) throw new Error("Invalid airport search response.");
  const seen = new Set<string>();
  const results: FlightPlaceSuggestion[] = [];
  for (const row of value.suggestions) {
    if (!isRecord(row)) continue;
    const code = typeof row.code === "string" ? row.code.trim().toUpperCase() : "";
    const airport = typeof row.airport === "string" ? row.airport.trim() : "";
    const city = typeof row.city === "string" ? row.city.trim() : "";
    const country = typeof row.country === "string" ? row.country.trim() : "";
    const type = row.type;
    if (!/^[A-Z]{3}$/.test(code) || !airport || !city || (type !== "airport" && type !== "city") || seen.has(code)) continue;
    seen.add(code);
    results.push(country ? { code, airport, city, country, type } : { code, airport, city, type });
    if (results.length === 8) break;
  }
  return results;
}

export async function searchFlightPlaces(query: string, options: RequestOptions & { context: "origin" | "destination" }): Promise<FlightPlaceSuggestion[]> {
  const base = getApiBaseUrl();
  if (!base.ok) throw new Error(base.message);
  const params = new URLSearchParams({ context: options.context, q: query.trim() });
  const response = await (options.fetcher ?? fetch)(`${base.baseUrl}/api/flights/places?${params}`, { method: "GET", headers: { Accept: "application/json" }, signal: options.signal });
  if (!response.ok) throw new Error("Airport search unavailable.");
  return parseFlightPlaceSuggestions(await response.json());
}

export function parseCarLocationSuggestions(value: unknown): CarLocationSuggestion[] {
  if (!isRecord(value) || !Array.isArray(value.suggestions)) throw new Error("Invalid car location response.");
  const seen = new Set<string>(); const results: CarLocationSuggestion[] = [];
  for (const row of value.suggestions) {
    if (!isRecord(row)) continue;
    const id=typeof row.id==="string"?row.id.trim():"", valueText=typeof row.value==="string"?row.value.trim():"";
    const primaryText=typeof row.primaryText==="string"?row.primaryText.trim():"", secondaryText=typeof row.secondaryText==="string"?row.secondaryText.trim():"";
    const kind=row.kind, airportCode=typeof row.airportCode==="string"?row.airportCode.trim().toUpperCase():"";
    if (!id || !valueText || !primaryText || !secondaryText || (kind!=="airport"&&kind!=="city"&&kind!=="area") || seen.has(id)) continue;
    if (airportCode && !/^[A-Z]{3}$/.test(airportCode)) continue;
    seen.add(id); results.push(airportCode?{id,kind,value:valueText,primaryText,secondaryText,airportCode}:{id,kind,value:valueText,primaryText,secondaryText});
    if(results.length===8) break;
  }
  return results;
}

export async function searchCarLocations(query: string, options: RequestOptions = {}): Promise<CarLocationSuggestion[]> {
  const base=getApiBaseUrl(); if(!base.ok) throw new Error(base.message);
  const params=new URLSearchParams({q:query.trim()});
  const response=await (options.fetcher??fetch)(`${base.baseUrl}/api/cars/locations?${params}`,{method:"GET",headers:{Accept:"application/json"},signal:options.signal});
  if(!response.ok) throw new Error("Car location search unavailable.");
  return parseCarLocationSuggestions(await response.json());
}
