import { normalizeLanguage, type LanguageCode } from "@/lib/language";
import {
  REGION_COOKIE_KEY as SERVER_REGION_COOKIE_KEY,
  REGION_OVERRIDE_COOKIE_KEY,
  REGION_OVERRIDE_STORAGE_KEY,
  REGION_STORAGE_KEY as SERVER_REGION_STORAGE_KEY,
} from "@/config/regionConfig";

export const LOCALE_COOKIE_KEY = "kurioticket_locale";
export const REGION_COOKIE_KEY = "kurioticket_region";
export const CURRENCY_COOKIE_KEY = "kurioticket_currency";

const ONE_YEAR = 60 * 60 * 24 * 365;

function getCookieValue(key: string): string | null {
  if (typeof document === "undefined") return null;
  const part = document.cookie
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${key}=`));
  return part ? decodeURIComponent(part.split("=")[1] ?? "") : null;
}

function setCookieValue(key: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function getStoredLocale(): LanguageCode {
  const cookie = getCookieValue(LOCALE_COOKIE_KEY);
  if (cookie) return normalizeLanguage(cookie);
  if (typeof window !== "undefined") return normalizeLanguage(window.localStorage.getItem(LOCALE_COOKIE_KEY));
  return "en-us";
}

export function setStoredLocale(locale: string) {
  const normalized = normalizeLanguage(locale);
  setCookieValue(LOCALE_COOKIE_KEY, normalized);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_COOKIE_KEY, normalized);
    window.localStorage.setItem("ct_language", normalized);
  }
}

export function getStoredRegion(): string | null {
  const overrideCookie = getCookieValue(REGION_OVERRIDE_COOKIE_KEY);
  if (overrideCookie) return overrideCookie.toUpperCase();

  if (typeof window !== "undefined") {
    return window.localStorage.getItem(REGION_OVERRIDE_STORAGE_KEY)?.toUpperCase() ?? null;
  }

  return null;
}

export function setStoredRegion(regionCode: string) {
  const normalizedRegionCode = regionCode.toUpperCase();
  setCookieValue(REGION_OVERRIDE_COOKIE_KEY, normalizedRegionCode);
  setCookieValue(REGION_COOKIE_KEY, normalizedRegionCode);
  setCookieValue(SERVER_REGION_COOKIE_KEY, normalizedRegionCode);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REGION_OVERRIDE_STORAGE_KEY, normalizedRegionCode);
    window.localStorage.setItem(REGION_COOKIE_KEY, normalizedRegionCode);
    window.localStorage.setItem(SERVER_REGION_STORAGE_KEY, normalizedRegionCode);
  }
}

export function getStoredCurrency(): string {
  const cookie = getCookieValue(CURRENCY_COOKIE_KEY);
  if (cookie) return cookie;
  if (typeof window !== "undefined") return window.localStorage.getItem(CURRENCY_COOKIE_KEY) ?? "USD";
  return "USD";
}

export function setStoredCurrency(currency: string) {
  setCookieValue(CURRENCY_COOKIE_KEY, currency);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CURRENCY_COOKIE_KEY, currency);
  }
}
