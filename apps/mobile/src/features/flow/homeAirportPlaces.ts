import { getDefaultAirports } from "../../../../../src/data/airports";
import { getApiBaseUrl } from "../../config/apiUrl";
import type { Airport } from "./airportData";

export type AirportPickerContext = "origin" | "destination";
export type AirportPlacesFetcher = (input: string, init?: RequestInit) => Promise<Response>;

const asAirports = (value: unknown): Airport[] => Array.isArray(value)
  ? value.filter((airport): airport is Airport => Boolean(
    airport && typeof airport === "object" && /^[A-Z]{3}$/.test(String((airport as Airport).code)),
  ))
  : [];

export const curatedHomepageDefaults = (context: AirportPickerContext, limit: number) =>
  getDefaultAirports({ context, limit }) as Airport[];

export function mergeAirportResults(primary: Airport[], fallback: Airport[], limit: number) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((airport) => {
    if (seen.has(airport.code)) return false;
    seen.add(airport.code);
    return true;
  }).slice(0, limit);
}

/** Homepage-only adapter for the website flight places contract. */
export async function requestHomepageAirportPlaces({
  baseUrl,
  context,
  query,
  limit,
  signal,
  locale = Intl.DateTimeFormat().resolvedOptions().locale,
  fetcher = fetch,
}: {
  baseUrl: string;
  context: AirportPickerContext;
  query: string;
  limit: number;
  signal?: AbortSignal;
  locale?: string;
  fetcher?: AirportPlacesFetcher;
}) {
  const trimmed = query.trim();
  const params = new URLSearchParams({ context });
  if (trimmed) params.set("q", trimmed);
  else params.set("default", "true");
  if (locale) params.set("locale", locale);
  const response = await fetcher(`${baseUrl}/api/flights/places?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("Airport suggestions are unavailable.");
  const payload = await response.json() as { suggestions?: unknown };
  const suggestions = asAirports(payload.suggestions);
  return trimmed
    ? suggestions.slice(0, limit)
    : mergeAirportResults(suggestions, curatedHomepageDefaults(context, limit), limit);
}

export function homepageAirportApiBaseUrl() {
  const result = getApiBaseUrl();
  return result.ok ? result.baseUrl : null;
}
