import type { AirportOption } from "@/data/airports";
import type { HotelDestinationSuggestion } from "@/data/hotelDestinations";
import type { CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";
import type { CanonicalLocation, LocationKind } from "./types";

const version = "legacy-catalog-v1";
const source = { catalog: "kurioticket" as const, datasetVersion: version };

export function fromAirport(airport: AirportOption): CanonicalLocation {
  return {
    id: `airport:${airport.code.toUpperCase()}`,
    kind: "airport",
    primaryLabel: `${airport.city} (${airport.code.toUpperCase()})`,
    supportingLabel: airport.airport,
    submittedValue: airport.code.toUpperCase(),
    country: { code: airport.countryCode, name: airport.country },
    coordinates: airport.latitude !== undefined && airport.longitude !== undefined
      ? { latitude: airport.latitude, longitude: airport.longitude }
      : airport.lat !== undefined && airport.lon !== undefined
        ? { latitude: airport.lat, longitude: airport.lon }
        : undefined,
    codes: { iata: airport.code.toUpperCase() },
    aliases: airport.name ? [airport.name] : undefined,
    staticCoverage: { flights: "reference-only", hotels: "none", cars: "reference-only", packages: "reference-only" },
    source,
  };
}

export function fromHotelDestination(destination: HotelDestinationSuggestion): CanonicalLocation {
  const airportCode = destination.kind === "airport-area"
    ? destination.aliases?.find((alias) => /^[A-Za-z]{3}$/.test(alias.trim()))?.toUpperCase()
    : undefined;
  return {
    id: `hotel:${destination.id}`,
    kind: destination.kind === "airport-area" ? "airport" : destination.kind,
    primaryLabel: destination.name,
    supportingLabel: [destination.region, destination.country].filter(Boolean).join(", "),
    submittedValue: destination.searchValue,
    country: { code: destination.countryCode, name: destination.country },
    region: destination.region,
    codes: airportCode ? { iata: airportCode } : undefined,
    aliases: destination.aliases,
    staticCoverage: { flights: "none", hotels: "exact", cars: "none", packages: "exact" },
    source,
  };
}

const carKinds: Record<CarLocationSuggestion["kind"], LocationKind> = {
  airport: "airport", city: "city", area: "rental-area", custom: "custom",
};

export function fromCarLocation(location: CarLocationSuggestion): CanonicalLocation {
  return {
    id: `car:${location.id}`,
    kind: carKinds[location.kind],
    primaryLabel: location.primaryText,
    supportingLabel: location.secondaryText,
    submittedValue: location.value,
    country: { code: location.countryCode },
    codes: location.airportCode ? { iata: location.airportCode } : undefined,
    providerIds: location.providerPlaceId ? { legacy: location.providerPlaceId } : undefined,
    staticCoverage: { flights: "none", hotels: "none", cars: location.kind === "custom" ? "none" : "exact", packages: "none" },
    source,
  };
}
