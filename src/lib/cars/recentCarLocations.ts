import type { CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";

const STORAGE_KEY = "kurioticket:recent-car-locations";
const MAX_RECENTS = 3;

export function readRecentCarLocations(): CarLocationSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isLocation).slice(0, MAX_RECENTS) : [];
  } catch { return []; }
}

export function saveRecentCarLocation(location: CarLocationSuggestion) {
  if (typeof window === "undefined" || location.kind === "custom") return;
  const next = [location, ...readRecentCarLocations().filter((item) => item.id !== location.id)].slice(0, MAX_RECENTS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeRecentCarLocation(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readRecentCarLocations().filter((item) => item.id !== id)));
}

function isLocation(value: unknown): value is CarLocationSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CarLocationSuggestion>;
  return typeof item.id === "string" && typeof item.value === "string" && typeof item.primaryText === "string" && typeof item.secondaryText === "string" && ["airport", "city", "area", "custom"].includes(item.kind ?? "");
}
