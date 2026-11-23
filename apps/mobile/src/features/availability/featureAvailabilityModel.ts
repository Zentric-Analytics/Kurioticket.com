import type { FeatureAvailability } from "../../api/travelApi";

export const safeFeatureAvailability: FeatureAvailability = Object.freeze({ flightSearch: true, hotelSearch: true, carSearch: true, deals: true, priceAlerts: true });
const CACHE_TTL_MS = 30_000;
let cached: { value: FeatureAvailability; expiresAt: number } | undefined;
export function getCachedFeatureAvailability() { return cached?.value; }
export function normalizeFeatureAvailability(value: unknown): FeatureAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(safeFeatureAvailability) as (keyof FeatureAvailability)[];
  if (!keys.every((key) => typeof record[key] === "boolean")) return null;
  return Object.fromEntries(keys.map((key) => [key, record[key]])) as FeatureAvailability;
}
export async function loadFeatureAvailability(fetcher: () => Promise<FeatureAvailability>, now = Date.now(), force = false) {
  if (!force && cached && cached.expiresAt > now) return { availability: cached.value, source: "cache" as const };
  try { const normalized = normalizeFeatureAvailability(await fetcher()); if (!normalized) throw new Error("invalid availability response"); cached = { value: normalized, expiresAt: now + CACHE_TTL_MS }; return { availability: normalized, source: "network" as const }; }
  catch { return { availability: cached?.value ?? safeFeatureAvailability, source: cached ? "stale-cache" as const : "safe-default" as const }; }
}

export type AvailabilityLifecycleState = {
  availability: FeatureAvailability;
  initializing: boolean;
  refreshing: boolean;
};

export function initialAvailabilityLifecycleState(value = getCachedFeatureAvailability()): AvailabilityLifecycleState {
  return {
    availability: value ?? safeFeatureAvailability,
    initializing: !value,
    refreshing: false,
  };
}

export function beginAvailabilityRefresh(state: AvailabilityLifecycleState): AvailabilityLifecycleState {
  return state.initializing ? state : { ...state, refreshing: true };
}

export function finishAvailabilityRefresh(
  state: AvailabilityLifecycleState,
  availability: FeatureAvailability,
): AvailabilityLifecycleState {
  return { availability, initializing: false, refreshing: false };
}
export function resetFeatureAvailabilityCacheForTests() { cached = undefined; }
export type MobileProduct = "flight" | "hotel" | "car" | "deals";
export function isMobileProductAvailable(availability: FeatureAvailability, product: MobileProduct) { return availability[product === "flight" ? "flightSearch" : product === "hotel" ? "hotelSearch" : product === "car" ? "carSearch" : "deals"]; }
export function canCreateOrReactivatePriceAlert(availability: FeatureAvailability) { return availability.priceAlerts; }
