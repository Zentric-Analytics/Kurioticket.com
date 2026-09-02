import { hotelDestinations, normalizeHotelDestinationSearchValue } from "../../data/hotelDestinations";

export type HotelDiscoverySource =
  | "home-popular-stays"
  | "home-country-directory"
  | "hotels-featured"
  | "explore"
  | "saved-destination";

export function resolveHotelDiscoveryIntent(destinationName: string, source: HotelDiscoverySource) {
  const requested = destinationName.trim();
  if (!requested) return null;
  const normalizedRequested = normalizeHotelDestinationSearchValue(requested);
  const canonical = hotelDestinations.find(
    (candidate) => normalizeHotelDestinationSearchValue(candidate.name) === normalizedRequested
      || normalizeHotelDestinationSearchValue(candidate.searchValue) === normalizedRequested,
  );
  if (!canonical) return null;
  return { kind: "hotel-destination" as const, canonicalDestinationId: canonical.id, destinationSearchValue: canonical.searchValue, source };
}

export function buildHotelDiscoveryHref(destinationName: string, source: HotelDiscoverySource) {
  const intent = resolveHotelDiscoveryIntent(destinationName, source);
  if (!intent) return "/hotels";
  return `/hotels?${new URLSearchParams({ destinationId: intent.canonicalDestinationId, destination: intent.destinationSearchValue, intentSource: intent.source }).toString()}`;
}
