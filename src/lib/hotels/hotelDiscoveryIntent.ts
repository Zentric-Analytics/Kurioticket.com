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
  if (intent) {
    return `/hotels?${new URLSearchParams({ destinationId: intent.canonicalDestinationId, destination: intent.destinationSearchValue, intentSource: intent.source }).toString()}`;
  }
  return "/hotels";
}

export function buildMaintainedHotelDiscoveryHref(destinationName: string, source: HotelDiscoverySource) {
  const canonicalHref = buildHotelDiscoveryHref(destinationName, source);
  if (canonicalHref !== "/hotels") return canonicalHref;
  const destination = destinationName.trim().replace(/\s+/g, " ");
  if (destination.length < 2 || destination.length > 120 || /[\u0000-\u001f\u007f]/.test(destination)) return "/hotels";
  return `/hotels?${new URLSearchParams({ destination, intentSource: source }).toString()}`;
}
