import { normalizeCountryCode } from "@/lib/geo/context";

export type CountryContext = {
  countryCode: string;
  country: string;
  continentCode?: string;
  continent?: string;
  source: "ipinfo-lite";
};

type IpinfoLiteResponse = {
  country_code?: unknown;
  country?: unknown;
  continent_code?: unknown;
  continent?: unknown;
};

const DEFAULT_BASE_URL = "https://api.ipinfo.io/lite";
const REQUEST_TIMEOUT_MS = 2000;

const firstHeaderValue = (value: string | null) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .find((item) => item && item.toLowerCase() !== "unknown") || null;

export const extractVisitorIp = (headers: Headers): string | null => {
  const forwardedFor = firstHeaderValue(headers.get("x-forwarded-for"));
  if (forwardedFor) return forwardedFor;

  const realIp = firstHeaderValue(headers.get("x-real-ip"));
  if (realIp) return realIp;

  const cfIp = firstHeaderValue(headers.get("cf-connecting-ip"));
  if (cfIp) return cfIp;

  const flyIp = firstHeaderValue(headers.get("fly-client-ip"));
  if (flyIp) return flyIp;

  return null;
};

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const resolveIpinfoLiteCountryContext = async (visitorIp?: string | null): Promise<CountryContext | null> => {
  const token = process.env.IPINFO_TOKEN?.trim();
  if (!token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const ipPath = visitorIp ? encodeURIComponent(visitorIp) : "me";
    const endpoint = `${DEFAULT_BASE_URL}/${ipPath}?token=${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as IpinfoLiteResponse;
    const countryCode = normalizeCountryCode(readString(payload.country_code));
    const country = readString(payload.country);

    if (!countryCode || !country) return null;

    const continentCode = normalizeCountryCode(readString(payload.continent_code));
    const continent = readString(payload.continent) || undefined;

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
