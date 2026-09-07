import type { CarSearchParams } from "@/lib/cars/types";

const identityText = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function canonicalCarPriceAlertSearch(search: CarSearchParams): CarSearchParams {
  const pickupLocation = String(search.pickupLocation ?? "").trim();
  return {
    pickupLocation,
    dropoffLocation: String(search.dropoffLocation ?? "").trim() || pickupLocation,
    pickupDate: String(search.pickupDate ?? "").trim(),
    pickupTime: String(search.pickupTime ?? "").trim(),
    dropoffDate: String(search.dropoffDate ?? "").trim(),
    dropoffTime: String(search.dropoffTime ?? "").trim(),
    driverAge: String(search.driverAge ?? "").trim(),
  };
}

export function buildCarPriceAlertPayload(search: CarSearchParams, targetPrice: number, currency: string) {
  const query = canonicalCarPriceAlertSearch(search);
  return { type: "CAR" as const, origin: query.pickupLocation, destination: query.dropoffLocation, targetPrice, mode: "TARGET" as const, currency: currency.trim().toUpperCase(), query };
}

export function carPriceAlertDuplicateKey(input: { origin?: string | null; destination: string; targetPrice?: { toString(): string } | number | string | null; currency: string; query: unknown }) {
  const raw = input.query && typeof input.query === "object" && !Array.isArray(input.query) ? input.query as Record<string, unknown> : {};
  const query = canonicalCarPriceAlertSearch(raw as CarSearchParams);
  const target = input.targetPrice == null ? NaN : Number(input.targetPrice.toString());
  if (!Number.isFinite(target) || target <= 0 || !query.pickupLocation || !query.dropoffLocation) return null;
  return JSON.stringify([identityText(query.pickupLocation), identityText(query.dropoffLocation), query.pickupDate, query.pickupTime, query.dropoffDate, query.dropoffTime, query.driverAge, input.currency.trim().toUpperCase(), target]);
}
