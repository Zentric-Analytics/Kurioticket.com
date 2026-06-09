import { normalizeCountryCode } from "@/lib/geo/context";
import { extractVisitorIp } from "@/lib/geo/ipinfo";

export type GeoIpLocation = {
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  source: "maxmind";
  accuracyType: "ip_city_estimate";
};

type MaxMindCityResponse = {
  country?: { iso_code?: string };
  registered_country?: { iso_code?: string };
  subdivisions?: Array<{ iso_code?: string; names?: Record<string, string> }>;
  city?: { names?: Record<string, string> };
  location?: {
    latitude?: number;
    longitude?: number;
    time_zone?: string;
  };
};

type GeoIpCacheEntry = {
  expiresAt: number;
  location: GeoIpLocation;
};

const MAXMIND_CITY_ENDPOINT = "https://geoip.maxmind.com/geoip/v2.1/city";
const REQUEST_TIMEOUT_MS = 3000;
const DEFAULT_CACHE_TTL_SECONDS = 86_400;
const MAX_CACHE_TTL_SECONDS = 604_800;
const geoIpCache = new Map<string, GeoIpCacheEntry>();

const isEnabled = () => {
  const provider = process.env.GEOIP_PROVIDER?.trim().toLowerCase();
  return process.env.MAXMIND_GEOIP_ENABLED?.trim().toLowerCase() === "true" && (!provider || provider === "maxmind");
};

const readCacheTtlSeconds = () => {
  const parsed = Number(process.env.GEOIP_CACHE_TTL_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CACHE_TTL_SECONDS;
  return Math.min(Math.floor(parsed), MAX_CACHE_TTL_SECONDS);
};

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const readNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

const getLocalizedName = (names?: Record<string, string>) => readString(names?.en) || readString(Object.values(names || {})[0]);

const buildAuthorizationHeader = (accountId: string, licenseKey: string) => {
  const credentials = Buffer.from(`${accountId}:${licenseKey}`).toString("base64");
  return `Basic ${credentials}`;
};

const normalizeMaxMindResponse = (payload: MaxMindCityResponse): GeoIpLocation | null => {
  const countryCode = normalizeCountryCode(payload.country?.iso_code) ?? normalizeCountryCode(payload.registered_country?.iso_code);
  const region = readString(payload.subdivisions?.[0]?.iso_code) || getLocalizedName(payload.subdivisions?.[0]?.names) || undefined;
  const city = getLocalizedName(payload.city?.names) || undefined;
  const latitude = readNumber(payload.location?.latitude);
  const longitude = readNumber(payload.location?.longitude);
  const timezone = readString(payload.location?.time_zone) || undefined;

  if (!countryCode && !region && !city && typeof latitude !== "number" && typeof longitude !== "number" && !timezone) {
    return null;
  }

  return {
    countryCode,
    region,
    city,
    latitude,
    longitude,
    timezone,
    source: "maxmind",
    accuracyType: "ip_city_estimate",
  };
};

const getCachedLocation = (ip: string) => {
  const cached = geoIpCache.get(ip);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    geoIpCache.delete(ip);
    return null;
  }
  return cached.location;
};

const setCachedLocation = (ip: string, location: GeoIpLocation) => {
  try {
    geoIpCache.set(ip, {
      expiresAt: Date.now() + readCacheTtlSeconds() * 1000,
      location,
    });
  } catch {
    // GeoIP should remain a soft enhancement if process-local cache ever fails.
  }
};

export const resolveMaxMindGeoIpLocation = async (visitorIp?: string | null): Promise<GeoIpLocation | null> => {
  if (!isEnabled() || !visitorIp) return null;

  const accountId = process.env.MAXMIND_ACCOUNT_ID?.trim();
  const licenseKey = process.env.MAXMIND_LICENSE_KEY?.trim();
  if (!accountId || !licenseKey) return null;

  const cached = getCachedLocation(visitorIp);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${MAXMIND_CITY_ENDPOINT}/${encodeURIComponent(visitorIp)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: buildAuthorizationHeader(accountId, licenseKey),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as MaxMindCityResponse;
    const location = normalizeMaxMindResponse(payload);
    if (!location) return null;

    setCachedLocation(visitorIp, location);
    return location;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const resolveMaxMindGeoIpLocationForRequest = (request: Request) =>
  resolveMaxMindGeoIpLocation(extractVisitorIp(request.headers));
