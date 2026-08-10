import type { FeatureAvailability } from "../../api/travelApi";

export const safeFeatureAvailability: FeatureAvailability = Object.freeze({ flightSearch: true, hotelSearch: true, carSearch: true, deals: true, priceAlerts: true, routeWatch: true });
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
export async function loadFeatureAvailability(fetcher: () => Promise<FeatureAvailability>, now = Date.now()) {
  if (cached && cached.expiresAt > now) return { availability: cached.value, source: "cache" as const };
  try { const normalized = normalizeFeatureAvailability(await fetcher()); if (!normalized) throw new Error("invalid availability response"); cached = { value: normalized, expiresAt: now + CACHE_TTL_MS }; return { availability: normalized, source: "network" as const }; }
  catch { return { availability: cached?.value ?? safeFeatureAvailability, source: cached ? "stale-cache" as const : "safe-default" as const }; }
}
export function resetFeatureAvailabilityCacheForTests() { cached = undefined; }
export type MobileProduct = "flight" | "hotel" | "car" | "deals";
export function isMobileProductAvailable(availability: FeatureAvailability, product: MobileProduct) { return availability[product === "flight" ? "flightSearch" : product === "hotel" ? "hotelSearch" : product === "car" ? "carSearch" : "deals"]; }
export function canCreateOrReactivatePriceAlert(availability: FeatureAvailability) { return availability.priceAlerts; }
export function canActivateRouteWatch(availability: FeatureAvailability) { return availability.routeWatch; }
