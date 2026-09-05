import type { PublicHotelPropertyDetails } from "../../../../../src/lib/types";

export function nativeHotelSecondaryLocation(
  propertyDetails: PublicHotelPropertyDetails,
): string {
  const streetAddress = propertyDetails.streetAddress.toLocaleLowerCase();
  return [
    propertyDetails.neighbourhood,
    propertyDetails.city,
    propertyDetails.country,
  ]
    .map((part) => part.trim())
    .filter(
      (part, index, parts) =>
        part.length > 0 &&
        !streetAddress.includes(part.toLocaleLowerCase()) &&
        parts.findIndex(
          (candidate) =>
            candidate.toLocaleLowerCase() === part.toLocaleLowerCase(),
        ) === index,
    )
    .join(", ");
}

export function nativeHotelStayFitFacts(
  propertyDetails: PublicHotelPropertyDetails,
): string[] {
  return [
    propertyDetails.neighbourhood
      ? `${propertyDetails.neighbourhood} neighborhood`
      : "",
    propertyDetails.businessSuitable ? "Work-friendly property" : "",
    propertyDetails.familySuitable ? "Family-friendly" : "",
    propertyDetails.interestTags?.some((tag) =>
      /sightseeing|culture|history|art|theatre/i.test(tag),
    )
      ? "Good for sightseeing"
      : "",
    propertyDetails.accessibility?.length
      ? "Accessibility details available"
      : "",
  ].filter(Boolean);
}
