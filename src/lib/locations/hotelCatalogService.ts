import {
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
  hotelDestinations,
  searchHotelDestinations,
  type HotelDestinationSuggestion,
} from "@/data/hotelDestinations";
import { fromHotelDestination } from "./adapters";
import { searchLocations } from "./search";
import type { CanonicalLocation, LocationSearchMatch } from "./types";

export const HOTEL_CATALOG_VERSION = "legacy-catalog-v1";

export type HotelCatalogSearchResult = {
  suggestions: Array<HotelDestinationSuggestion & { canonical: CanonicalLocation }>;
  provenance: {
    source: "owned-catalog";
    catalogVersion: typeof HOTEL_CATALOG_VERSION;
    isLiveAvailability: false;
    staticCoverage: "exact";
  };
  recovery?: {
    kind: "unverified";
    coverage: "unverified";
    canSubmit: true;
    canSubmitQuery: true;
    message: string;
  };
};

function withCanonical(destination: HotelDestinationSuggestion, locale?: string) {
  const canonical = fromHotelDestination(destination);
  return {
    ...destination,
    canonical: {
      ...canonical,
      primaryLabel: getLocalizedHotelDestinationCityName(destination.name, locale),
      supportingLabel: getLocalizedHotelDestinationDetail(destination, locale) || destination.country,
    },
  };
}

export function searchCanonicalHotelCatalog({
  query = "",
  countryCode,
  locale,
  limit = 8,
}: {
  query?: string;
  countryCode?: string | null;
  locale?: string;
  limit?: number;
}): HotelCatalogSearchResult {
  const boundedLimit = Math.max(1, Math.min(10, Math.trunc(limit)));
  let suggestions: HotelDestinationSuggestion[];

  if (!query.trim()) {
    suggestions = searchHotelDestinations({ query, countryCode, limit: boundedLimit });
  } else {
    const normalizedCountry = countryCode?.trim().toUpperCase();
    const byId = new Map(hotelDestinations.map((destination) => [`hotel:${destination.id}`, destination]));
    const matches = searchLocations(hotelDestinations.map(fromHotelDestination), query, 25)
      .map(({ match, index }) => ({ match, index, destination: byId.get(match.location.id) }))
      .filter((entry): entry is { match: LocationSearchMatch; index: number; destination: HotelDestinationSuggestion } => Boolean(entry.destination))
      .sort((left, right) => {
        const leftLocal = normalizedCountry && left.destination.countryCode === normalizedCountry ? 1 : 0;
        const rightLocal = normalizedCountry && right.destination.countryCode === normalizedCountry ? 1 : 0;
        return rightLocal - leftLocal || right.match.score - left.match.score || left.index - right.index;
      });
    suggestions = matches.slice(0, boundedLimit).map(({ destination }) => destination);
  }

  const canonicalSuggestions = suggestions.map((destination) => withCanonical(destination, locale));
  return {
    suggestions: canonicalSuggestions,
    provenance: {
      source: "owned-catalog",
      catalogVersion: HOTEL_CATALOG_VERSION,
      isLiveAvailability: false,
      staticCoverage: "exact",
    },
    recovery: query.trim() && canonicalSuggestions.length === 0
      ? {
          kind: "unverified",
          coverage: "unverified",
          canSubmit: true,
          canSubmitQuery: true,
          message: "No matching catalogue destination. You can continue with this unverified location; static results may be unavailable.",
        }
      : undefined,
  };
}
