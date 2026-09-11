import type { CarResult } from "../../api/travelApi";
import { airports, normalizeAirportSearchText } from "../../../../../src/shared/airports";

export type NativeCarTrustedPickupCoordinates = { latitude: number; longitude: number };

export function nativeCarTrustedPickupCoordinates(location: string): NativeCarTrustedPickupCoordinates | null {
  const identity = normalizeAirportSearchText(location);
  if (!identity) return null;

  const matches = airports.filter((airport) => {
    const representations = [
      airport.code,
      airport.airport,
      `${airport.airport} (${airport.code})`,
      `${airport.city} ${airport.airport}`,
    ].map(normalizeAirportSearchText);
    return representations.includes(identity);
  });
  if (matches.length !== 1) return null;

  const airport = matches[0];
  const latitude = airport.latitude ?? airport.lat;
  const longitude = airport.longitude ?? airport.lon;
  if (
    typeof latitude !== "number" || typeof longitude !== "number" ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) return null;
  return { latitude, longitude };
}

export function nativeCarDetailDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

export function nativeCarRentalDays(start: string, end: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 1;
  return Math.max(1, Math.ceil((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000));
}

export const nativeCarPickupTypeLabel = (type: CarResult["pickupType"]) => ({
  "airport-counter": "Airport counter", shuttle: "Shuttle pickup", "city-location": "City location", "meet-and-greet": "Meet and greet",
})[type];
export const nativeCarFuelPolicyLabel = (policy: CarResult["fuelPolicy"]) => policy === "full-to-full" ? "Full-to-full" : policy === "same-to-same" ? "Same-to-same" : "Fuel policy";
export const nativeCarMileageLabel = (car: CarResult) => car.mileagePolicy === "unlimited" ? "Unlimited mileage" : `${car.limitedMileageKm ?? "—"} km included`;

export function nativeCarLocationEmbedUrl(baseUrl: string, id: string, search: Record<string, string>): string {
  const url = new URL("/api/mobile/v1/cars/location-embed", `${baseUrl}/`);
  url.search = new URLSearchParams({ id, ...search }).toString();
  return url.toString();
}

export function nativeCarDirectionsUrl(location: string): string | null {
  const destination = location.trim().replace(/\s+/g, " ");
  if (!destination) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.search = new URLSearchParams({ api: "1", destination }).toString();
  return url.toString();
}
