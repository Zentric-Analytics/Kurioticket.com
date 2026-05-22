import { REGION_COOKIE_KEY, type RegionMode } from "@/config/regionConfig";

export function normalizeRegion(value: string | null | undefined): RegionMode | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === "NG") return "NG";
  if (normalized === "GLOBAL") return "GLOBAL";
  return null;
}

export function countryToRegion(countryCode: string | null | undefined): RegionMode {
  return countryCode?.toUpperCase() === "NG" ? "NG" : "GLOBAL";
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
