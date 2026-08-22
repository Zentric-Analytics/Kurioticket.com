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

type HotelMapDetails = {
  hotelName: string;
  propertyDetails: PublicHotelPropertyDetails;
};

type HotelMapConfiguration = HotelMapDetails & {
  googleMapsEmbedApiKey?: string;
};

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

export function buildOpenStreetMapHotelMapEmbedUrl(
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

export function buildGoogleHotelMapEmbedUrl({
  hotelName,
  propertyDetails,
  googleMapsEmbedApiKey,
}: HotelMapConfiguration): string | null {
  const apiKey = googleMapsEmbedApiKey?.trim();
  if (!apiKey) return null;

  const address = buildHotelAddress(propertyDetails);
  const propertyQuery = [normalizeAddressPart(hotelName), address]
    .filter(Boolean)
    .join(", ");
  const query =
    propertyQuery ||
    (hasValidHotelCoordinates(propertyDetails)
      ? `${propertyDetails.latitude},${propertyDetails.longitude}`
      : "");
  if (!query) return null;

  const url = new URL("https://www.google.com/maps/embed/v1/place");
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    zoom: "16",
    maptype: "roadmap",
  });
  if (hasValidHotelCoordinates(propertyDetails)) {
    params.set(
      "center",
      `${propertyDetails.latitude},${propertyDetails.longitude}`,
    );
  }
  url.search = params.toString();
  return url.toString();
}

export function buildGoogleHotelStreetViewEmbedUrl({
  propertyDetails,
  googleMapsEmbedApiKey,
}: HotelMapConfiguration): string | null {
  const apiKey = googleMapsEmbedApiKey?.trim();
  if (!apiKey || !hasValidHotelCoordinates(propertyDetails)) return null;

  const url = new URL("https://www.google.com/maps/embed/v1/streetview");
  url.search = new URLSearchParams({
    key: apiKey,
    location: `${propertyDetails.latitude},${propertyDetails.longitude}`,
    pitch: "0",
    fov: "80",
  }).toString();
  return url.toString();
}

export function buildHotelMapEmbedUrl(
  configuration: HotelMapConfiguration,
): string | null {
  return (
    buildGoogleHotelMapEmbedUrl(configuration) ??
    buildOpenStreetMapHotelMapEmbedUrl(configuration.propertyDetails)
  );
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
