import type { NormalizedHotelResult, PublicHotelPropertyDetails } from "@/lib/types";
import type { PublicHotelProviderDetails, PublicHotelProviderFact } from "@/lib/hotels/hotelProviderDetails";
import { hasValidHotelCoordinates } from "@/lib/hotels/hotelMap";

type KayakHotelReference = {
  kind?: unknown;
  details?: unknown;
  location?: unknown;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function factValue(
  facts: PublicHotelProviderFact[] | undefined,
  pattern: RegExp,
): string {
  const matches = (facts ?? [])
    .filter(({ label, value }) => pattern.test(label) && value.trim())
    .map(({ value }) => value.trim());
  return matches.length === 1 ? matches[0]! : "";
}

export function kayakHotelLocationDetails(
  result: NormalizedHotelResult,
): PublicHotelPropertyDetails | null {
  const reference = result.rawProviderReference as KayakHotelReference | undefined;
  if (!reference || reference.kind !== "kayak-hotel-details") return null;

  const location = object(reference.location);
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!hasValidHotelCoordinates({ latitude, longitude })) return null;

  const details = object(reference.details) as PublicHotelProviderDetails;
  const overview = details.source === "KAYAK" ? details.overview : undefined;
  const place = overview?.place;
  const streetAddress =
    text(location.address)
    || overview?.address?.trim()
    || (result.location !== "Location not supplied" ? result.location.trim() : "");
  const country =
    factValue(place, /^(country|country name)$/i)
    || text(location.countryCode)
    || overview?.countryCode?.trim()
    || "";
  const city = factValue(place, /^(city|town|locality)$/i);
  const neighbourhood =
    result.neighbourhood?.trim()
    || factValue(place, /^(neighbou?rhood|district|area)$/i);

  return {
    description: "",
    latitude,
    longitude,
    streetAddress,
    city,
    country,
    neighbourhood,
    interestTags: [],
    accessibility: [],
  };
}
