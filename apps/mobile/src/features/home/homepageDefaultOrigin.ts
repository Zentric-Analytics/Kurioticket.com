import { getApiBaseUrl } from "../../config/apiUrl";

export type HomepageDefaultAirport = {
  code: string;
  city: string;
  country: string;
  airport: string;
};

type Fetcher = typeof fetch;
const DEFAULT_ORIGIN_TIMEOUT_MS = 6000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseHomepageDefaultOrigin(value: unknown): HomepageDefaultAirport | null {
  if (!isRecord(value)) return null;
  if ("suggestions" in value && !Array.isArray(value.suggestions)) return null;

  const parseAirport = (candidate: unknown): HomepageDefaultAirport | null => {
    if (!isRecord(candidate)) return null;
    const code = typeof candidate.code === "string" ? candidate.code.trim().toUpperCase() : "";
    const city = typeof candidate.city === "string" ? candidate.city.trim() : "";
    const country = typeof candidate.country === "string" ? candidate.country.trim() : "";
    const airport = typeof candidate.airport === "string" ? candidate.airport.trim() : "";
    return /^[A-Z]{3}$/.test(code) && city && country && airport
      ? { code, city, country, airport }
      : null;
  };

  const explicitDefault = parseAirport(value.defaultOriginAirport);
  if (explicitDefault) return explicitDefault;
  if (value.defaultOriginAirport != null) return null;

  for (const suggestion of (value.suggestions as unknown[] | undefined) ?? []) {
    const airport = parseAirport(suggestion);
    if (airport) return airport;
  }
  return null;
}

export async function fetchHomepageDefaultOrigin(
  fetcher: Fetcher = fetch,
): Promise<HomepageDefaultAirport | null> {
  const base = getApiBaseUrl();
  if (!base.ok) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_ORIGIN_TIMEOUT_MS);
  try {
    const response = await fetcher(
      `${base.baseUrl}/api/flights/places?context=origin&default=true`,
      { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal },
    );
    if (!response.ok) return null;
    return parseHomepageDefaultOrigin(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const canApplyHomepageDefaultOrigin = (
  hasOrigin: boolean,
  hasRouteOrigin: boolean,
  userControlsOrigin: boolean,
) => !hasOrigin && !hasRouteOrigin && !userControlsOrigin;
