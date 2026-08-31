import { airports } from "@/data/airports";
import { fromAirport } from "./adapters";
import { searchLocations } from "./search";
import type { CanonicalLocation, LocationSearchMatch } from "./types";

type FlightPlace = {
  code: string; city: string; airport: string; country?: string; countryCode?: string;
  duffelPlaceId?: string; type?: string; latitude?: number; longitude?: number;
  lat?: number; lon?: number;
};

export const FLIGHT_LOCATION_CATALOG_VERSION = "legacy-airports-v1";

const catalog = airports.map((airport) => ({
  ...fromAirport(airport),
  source: { catalog: "kurioticket" as const, datasetVersion: FLIGHT_LOCATION_CATALOG_VERSION },
}));

export type OwnedFlightLocationResult = {
  locations: CanonicalLocation[];
  matches: LocationSearchMatch[];
  source: "owned-catalog";
  catalogVersion: string;
  isLiveAvailability: false;
};

export function searchOwnedFlightLocations(query: string, limit = 10): OwnedFlightLocationResult {
  const matches = searchLocations(catalog, query, limit).map((entry) => entry.match);
  return {
    locations: matches.map((match) => match.location),
    matches,
    source: "owned-catalog",
    catalogVersion: FLIGHT_LOCATION_CATALOG_VERSION,
    isLiveAvailability: false,
  };
}

export function getOwnedFlightLocationCatalog() {
  return catalog;
}

export function fromFlightPlaceSuggestion(place: FlightPlace): CanonicalLocation {
  const owned = catalog.find((location) => location.codes?.iata === place.code.toUpperCase());
  if (!place.duffelPlaceId && owned) return owned;
  return {
    id: owned?.id ?? `flight-place:${place.code.toUpperCase()}`,
    kind: place.type === "city" ? "city" : "airport",
    primaryLabel: `${place.city} (${place.code.toUpperCase()})`,
    supportingLabel: place.airport,
    submittedValue: place.code.toUpperCase(),
    country: { code: place.countryCode, name: place.country },
    coordinates: typeof (place.latitude ?? place.lat) === "number" && typeof (place.longitude ?? place.lon) === "number"
      ? { latitude: (place.latitude ?? place.lat)!, longitude: (place.longitude ?? place.lon)! }
      : undefined,
    codes: { iata: place.code.toUpperCase() },
    providerIds: place.duffelPlaceId ? { duffel: place.duffelPlaceId } : undefined,
    staticCoverage: owned?.staticCoverage ?? { flights: "reference-only", hotels: "none", cars: "reference-only", packages: "reference-only" },
    source: owned?.source ?? { catalog: "kurioticket", datasetVersion: "live-provider-normalized-v1" },
  };
}
