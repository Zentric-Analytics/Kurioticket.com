export type MobileHotelResultsState = {
  minPrice: number;
  maxPrice: number | null;
  selectedHotelClasses: number[];
  propertyNameQuery: string;
  selectedFilters: Record<string, string[]>;
  sort: "cheapest" | "bestValue" | "topRated";
  page: number;
  scrollY: number;
  savedAt: number;
};

const prefix = "kurioticket:mobile-hotel-return:";

export function parseMobileHotelResultsState(raw: string | null, now = Date.now()): MobileHotelResultsState | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || !Number.isFinite(value.savedAt) || now - value.savedAt > 30 * 60_000 || value.savedAt > now) return null;
    if (!Number.isFinite(value.minPrice) || value.minPrice < 0 || (value.maxPrice !== null && (!Number.isFinite(value.maxPrice) || value.maxPrice < value.minPrice))) return null;
    if (!Array.isArray(value.selectedHotelClasses) || !value.selectedHotelClasses.every((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5)) return null;
    if (typeof value.propertyNameQuery !== "string" || !["cheapest", "bestValue", "topRated"].includes(value.sort)) return null;
    if (!value.selectedFilters || typeof value.selectedFilters !== "object" || Array.isArray(value.selectedFilters) || !Object.values(value.selectedFilters).every((group) => Array.isArray(group) && group.every((item) => typeof item === "string"))) return null;
    if (!Number.isInteger(value.page) || value.page < 1 || !Number.isFinite(value.scrollY) || value.scrollY < 0) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveMobileHotelResultsState(key: string, value: MobileHotelResultsState) {
  try { sessionStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
}

export function takeMobileHotelResultsState(key: string) {
  try {
    const raw = sessionStorage.getItem(prefix + key);
    sessionStorage.removeItem(prefix + key);
    return parseMobileHotelResultsState(raw);
  } catch {
    return null;
  }
}
