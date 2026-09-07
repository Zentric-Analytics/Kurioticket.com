import { z } from "zod";

import type { CarSearchParams } from "@/lib/cars/types";
import { supportedCurrencies } from "@/lib/region/supportedRegions";
import { priceAlertTargetSchema } from "@/lib/price-alerts/flightPriceAlerts";

const currencies = new Set(supportedCurrencies.map(({ code }) => code));
const location = z.string().trim().min(2).max(120);
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().trim().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const driverAge = z.string().trim().refine((value) => value === "18-70" || (/^\d{2}$/.test(value) && Number(value) >= 18 && Number(value) <= 70), "Invalid driver age.");

export const canonicalCarPriceAlertQuerySchema = z.object({
  pickupLocation: location,
  dropoffLocation: z.preprocess((value) => typeof value === "string" && !value.trim() ? undefined : value, location.optional()),
  pickupDate: date,
  pickupTime: time,
  dropoffDate: date,
  dropoffTime: time,
  driverAge,
}).transform((value) => ({ ...value, dropoffLocation: value.dropoffLocation || value.pickupLocation })).superRefine((value, context) => {
  const pickup = new Date(`${value.pickupDate}T${value.pickupTime}:00Z`);
  const dropoff = new Date(`${value.dropoffDate}T${value.dropoffTime}:00Z`);
  if (!Number.isFinite(pickup.getTime()) || !Number.isFinite(dropoff.getTime()) || dropoff <= pickup) {
    context.addIssue({ code: "custom", path: ["dropoffDate"], message: "Drop-off must be after pickup." });
  }
});

export type CanonicalCarPriceAlertQuery = z.infer<typeof canonicalCarPriceAlertQuerySchema>;

export function buildCarPriceAlertPayload(search: CarSearchParams, targetPrice: number, currency: string) {
  const query = canonicalCarPriceAlertQuerySchema.parse(search);
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!currencies.has(normalizedCurrency)) throw new Error("Unsupported alert currency.");
  return {
    type: "CAR" as const,
    origin: query.pickupLocation,
    destination: query.dropoffLocation,
    targetPrice: priceAlertTargetSchema.parse(targetPrice),
    mode: "TARGET" as const,
    currency: normalizedCurrency,
    query,
  };
}

export function carPriceAlertDuplicateKey(input: { origin: string | null; destination: string; targetPrice: { toString(): string } | number | string | null; currency: string | null; query: unknown }) {
  const parsed = canonicalCarPriceAlertQuerySchema.safeParse(input.query);
  const target = input.targetPrice == null ? NaN : Number(input.targetPrice.toString());
  if (!parsed.success || !Number.isFinite(target) || target <= 0) return null;
  const query = parsed.data;
  if (input.origin?.trim().toLowerCase() !== query.pickupLocation.toLowerCase() || input.destination.trim().toLowerCase() !== query.dropoffLocation.toLowerCase()) return null;
  return [query.pickupLocation, query.dropoffLocation, query.pickupDate, query.pickupTime, query.dropoffDate, query.dropoffTime, query.driverAge]
    .map((value) => value.toLowerCase()).concat((input.currency || "").trim().toUpperCase(), target.toFixed(2)).join("|");
}
