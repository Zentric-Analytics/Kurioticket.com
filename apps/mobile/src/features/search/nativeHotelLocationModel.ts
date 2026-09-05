import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";

type LocationParts = Pick<
  PublicHotelPropertyDetails,
  "streetAddress" | "neighbourhood" | "city" | "country"
>;

export function nativeHotelSecondaryLocation(details: LocationParts): string {
  const streetAddress = details.streetAddress.trim().toLocaleLowerCase();
  return [details.neighbourhood, details.city, details.country]
    .map((part) => part.trim())
    .filter(
      (part, index, parts) =>
        Boolean(part) &&
        !streetAddress.includes(part.toLocaleLowerCase()) &&
        parts.findIndex(
          (candidate) =>
            candidate.trim().toLocaleLowerCase() === part.toLocaleLowerCase(),
        ) === index,
    )
    .join(", ");
}

export function nativeHotelStayFitFacts(
  details: PublicHotelPropertyDetails,
): string[] {
  return [
    details.neighbourhood.trim()
      ? `${details.neighbourhood.trim()} neighborhood`
      : "",
    details.businessSuitable ? "Work-friendly property" : "",
    details.familySuitable ? "Family-friendly" : "",
    details.interestTags?.some((tag) =>
      /sightseeing|culture|history|art|theatre/i.test(tag),
    )
      ? "Good for sightseeing"
      : "",
    details.accessibility?.some((detail) => detail.trim())
      ? "Accessibility details available"
      : "",
  ].filter(Boolean);
}
