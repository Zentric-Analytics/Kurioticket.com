import { REGION_COOKIE_KEY, countryCurrencyOptions, type CountryCurrencyOption } from "@/config/regionConfig";

export type RegionMode = CountryCurrencyOption["code"];

const SUPPORTED_CODES = new Set(countryCurrencyOptions.map((option) => option.code));

export function normalizeRegion(value: string | null | undefined): RegionMode | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (SUPPORTED_CODES.has(normalized)) {
    return normalized as RegionMode;
  }
  return null;
}

export function countryToRegion(countryCode: string | null | undefined): RegionMode {
  return normalizeRegion(countryCode) ?? "US";
}

export function readCookieRegion(cookieHeader: string | null | undefined): RegionMode | null {
  if (!cookieHeader) return null;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REGION_COOKIE_KEY}=`));

  if (!cookie) return null;
  return normalizeRegion(cookie.split("=")[1] ?? null);
}
