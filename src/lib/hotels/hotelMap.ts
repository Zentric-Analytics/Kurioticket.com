import type { PublicHotelPropertyDetails } from "@/lib/types";

const LATITUDE_SPAN = 0.0045;
const LONGITUDE_SPAN = 0.008;

function formatCoordinate(value: number): string {
  return Number(value.toFixed(6)).toString();
}

type HotelCoordinates = Pick<
  PublicHotelPropertyDetails,
  "latitude" | "longitude"
>;

export function hasValidHotelCoordinates(
  coordinates: HotelCoordinates,
): boolean {
  return (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
}

export function buildHotelMapEmbedUrl(
  coordinates: HotelCoordinates,
): string | null {
  if (!hasValidHotelCoordinates(coordinates)) return null;

  const { latitude, longitude } = coordinates;
  const url = new URL("https://www.openstreetmap.org/export/embed.html");
  url.search = new URLSearchParams({
    bbox: [
      longitude - LONGITUDE_SPAN,
      latitude - LATITUDE_SPAN,
      longitude + LONGITUDE_SPAN,
      latitude + LATITUDE_SPAN,
    ].map(formatCoordinate).join(","),
    layer: "mapnik",
    marker: `${latitude},${longitude}`,
  }).toString();
  return url.toString();
}

function normalizeAddressPart(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function buildHotelAddress(
  details: PublicHotelPropertyDetails,
): string {
  const parts: string[] = [];
  for (const value of [details.streetAddress, details.city, details.country]) {
    const part = normalizeAddressPart(value);
    if (!part) continue;
    const normalized = part.toLocaleLowerCase();
    if (
      parts.some((existing) =>
        existing.toLocaleLowerCase().includes(normalized),
      )
    )
      continue;
    parts.push(part);
  }
  return parts.join(", ");
}

export function buildHotelDirectionsUrl(
  details: PublicHotelPropertyDetails,
): string | null {
  const address = buildHotelAddress(details);
  const destination = hasValidHotelCoordinates(details)
    ? `${details.latitude},${details.longitude}`
    : address;
  if (!destination) return null;

  const url = new URL("https://www.google.com/maps/dir/");
  url.search = new URLSearchParams({
    api: "1",
    destination,
  }).toString();
  return url.toString();
}
