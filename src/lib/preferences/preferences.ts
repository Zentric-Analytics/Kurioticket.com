import {
  REGION_COOKIE_KEY as SERVER_REGION_COOKIE_KEY,
  REGION_OVERRIDE_COOKIE_KEY,
  REGION_OVERRIDE_STORAGE_KEY,
  REGION_STORAGE_KEY as SERVER_REGION_STORAGE_KEY,
} from "@/config/regionConfig";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/language";

export const LOCALE_COOKIE_KEY = "kurioticket_locale";
export const REGION_COOKIE_KEY = "kurioticket_region";
export const CURRENCY_COOKIE_KEY = "kurioticket_currency";

const ONE_YEAR = 60 * 60 * 24 * 365;
const VALID_CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

function getCookieValue(key: string): string | null {
  if (typeof document === "undefined") return null;

  try {
    const part = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${key}=`));

    return part ? decodeURIComponent(part.split("=")[1] ?? "") : null;
  } catch {
    // A blocked cookie jar or malformed preference must not break the page.
    return null;
  }
}

function setCookieValue(key: string, value: string) {
  if (typeof document === "undefined") return;

  try {
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  } catch {
    // The current-document preference remains usable without persistence.
  }
}

function getLocalStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function setLocalStorageValue(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch { /* Optional persistence can be denied or full. */ }
}

export function getStoredLocale(): LanguageCode {
  const cookie = getCookieValue(LOCALE_COOKIE_KEY);

  if (cookie) return normalizeLanguage(cookie);

  if (typeof window !== "undefined") {
    const currentValue = getLocalStorageValue(LOCALE_COOKIE_KEY);
    if (currentValue) return normalizeLanguage(currentValue);

    const legacyValue = getLocalStorageValue(LANGUAGE_STORAGE_KEY);
    if (legacyValue) return normalizeLanguage(legacyValue);
  }

  return "en-us";
}

export function setStoredLocale(locale: string) {
  const normalized = normalizeLanguage(locale);

  setCookieValue(LOCALE_COOKIE_KEY, normalized);

  if (typeof window !== "undefined") {
    setLocalStorageValue(LOCALE_COOKIE_KEY, normalized);
    setLocalStorageValue(LANGUAGE_STORAGE_KEY, normalized);
  }
}

export function getStoredRegion(): string | null {
  const overrideCookie = getCookieValue(REGION_OVERRIDE_COOKIE_KEY);
  if (overrideCookie) return overrideCookie.toUpperCase();

  const regionCookie = getCookieValue(REGION_COOKIE_KEY);
  if (regionCookie) return regionCookie.toUpperCase();

  const legacyRegionCookie = getCookieValue(SERVER_REGION_COOKIE_KEY);
  if (legacyRegionCookie) return legacyRegionCookie.toUpperCase();

  if (typeof window !== "undefined") {
    return (
      getLocalStorageValue(REGION_OVERRIDE_STORAGE_KEY)?.toUpperCase() ??
      getLocalStorageValue(REGION_COOKIE_KEY)?.toUpperCase() ??
      getLocalStorageValue(SERVER_REGION_STORAGE_KEY)?.toUpperCase() ??
      null
    );
  }

  return null;
}

export function setStoredDetectedRegion(regionCode: string) {
  const normalizedRegionCode = regionCode.toUpperCase();

  setCookieValue(REGION_COOKIE_KEY, normalizedRegionCode);
  setCookieValue(SERVER_REGION_COOKIE_KEY, normalizedRegionCode);

  if (typeof window !== "undefined") {
    setLocalStorageValue(REGION_COOKIE_KEY, normalizedRegionCode);
    setLocalStorageValue(
      SERVER_REGION_STORAGE_KEY,
      normalizedRegionCode,
    );
  }
}

export function setStoredRegion(regionCode: string) {
  const normalizedRegionCode = regionCode.toUpperCase();

  setCookieValue(REGION_OVERRIDE_COOKIE_KEY, normalizedRegionCode);
  setStoredDetectedRegion(normalizedRegionCode);

  if (typeof window !== "undefined") {
    setLocalStorageValue(
      REGION_OVERRIDE_STORAGE_KEY,
      normalizedRegionCode,
    );
  }
}

export function getStoredCurrency(): string | null {
  const cookie = getCookieValue(CURRENCY_COOKIE_KEY);
  if (cookie) return cookie.toUpperCase();

  if (typeof window !== "undefined") {
    return (
      getLocalStorageValue(CURRENCY_COOKIE_KEY)?.toUpperCase() ?? null
    );
  }

  return null;
}

export function setStoredCurrency(currency: string) {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (!VALID_CURRENCY_CODE_PATTERN.test(normalizedCurrency)) return;

  setCookieValue(CURRENCY_COOKIE_KEY, normalizedCurrency);

  if (typeof window !== "undefined") {
    setLocalStorageValue(CURRENCY_COOKIE_KEY, normalizedCurrency);
  }
}
