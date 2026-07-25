import type { CarFuelPolicy, CarMileagePolicy, CarPickupType, CarTransmission } from "@/lib/cars/types";

export const transmissionLabels: Record<CarTransmission, string> = { automatic: "Automatic", manual: "Manual" };
export const fuelPolicyLabels: Record<CarFuelPolicy, string> = { "full-to-full": "Full-to-full", "same-to-same": "Same-to-same", other: "Other" };
export const pickupTypeLabels: Record<CarPickupType, string> = { "airport-counter": "Airport counter", shuttle: "Shuttle pickup", "city-location": "City location", "meet-and-greet": "Meet and greet" };
export const mileagePolicyLabels: Record<CarMileagePolicy, string> = { unlimited: "Unlimited mileage", limited: "Limited mileage" };

export function formatCarDate(value: string, locale: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value || "—";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}
