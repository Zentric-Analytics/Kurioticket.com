import { normalizeCountryCode } from "@/lib/geo/context";

export type CountryContext = {
  countryCode: string;
  country: string;
  continentCode?: string;
  continent?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  source: "ipinfo-lite";
};

type IpinfoLiteResponse = {
  country_code?: string;
  country?: string;
  continent_code?: string;
  continent?: string;
};

const DEFAULT_BASE_URL = "https://api.ipinfo.io/lite";
const REQUEST_TIMEOUT_MS = 2000;

const isEnabled = () => process.env.IPINFO_ENABLED === "true";

const getBaseUrl = () => (process.env.IPINFO_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/$/, "");

export const extractVisitorIp = (headers: Headers): string | null => {
  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")
      .map((value) => value.trim())
      .find(Boolean);
    if (firstIp) return firstIp;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
};

export const resolveIpinfoLiteCountryContext = async (visitorIp: string): Promise<CountryContext | null> => {
  const token = process.env.IPINFO_TOKEN?.trim();
  if (!isEnabled() || !token || !visitorIp) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const endpoint = `${getBaseUrl()}/${encodeURIComponent(visitorIp)}?token=${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as IpinfoLiteResponse;
    const countryCode = normalizeCountryCode(payload.country_code);
    const country = payload.country?.trim();

    if (!countryCode || !country) return null;

    const continentCode = normalizeCountryCode(payload.continent_code);
    const continent = payload.continent?.trim() || undefined;

    return {
      countryCode,
      country,
      continentCode,
      continent,
      source: "ipinfo-lite",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
