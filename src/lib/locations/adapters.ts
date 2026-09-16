import { airports, type AirportOption } from "@/data/airports";
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
    providerBindings: [{ provider: "kayak", value: airport.code.toUpperCase(), kind: "airport", verification: "verified", provenance: "catalogue" }],
    verification: "verified",
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

const preferredCarAirportCode = (location: CarLocationSuggestion) => {
  if (location.airportCode) return location.airportCode.toUpperCase();
  if (location.kind !== "city") return undefined;
  const city = (location.city || location.primaryText).trim().toLocaleLowerCase("en-US");
  const countryCode = location.countryCode?.trim().toUpperCase();
  return airports
    .filter((airport) => airport.city.trim().toLocaleLowerCase("en-US") === city && (!countryCode || airport.countryCode === countryCode))
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0]?.code.toUpperCase();
};

export function fromCarLocation(location: CarLocationSuggestion): CanonicalLocation {
  const airportCode = preferredCarAirportCode(location);
  const primaryLabel = location.kind === "airport" && airportCode
    ? `${location.city || location.primaryText} (${airportCode})`
    : location.kind === "custom" ? location.value : location.primaryText;
  const supportingLabel = location.kind === "airport" ? location.primaryText : location.secondaryText;
  return {
    id: `car:${location.id}`,
    kind: carKinds[location.kind],
    primaryLabel,
    supportingLabel,
    submittedValue: location.value,
    country: { code: location.countryCode },
    codes: airportCode ? { iata: airportCode } : undefined,
    providerIds: location.providerPlaceId ? { legacy: location.providerPlaceId } : undefined,
    providerBindings: airportCode ? [{ provider: "kayak", value: airportCode, kind: "airport", verification: "verified", provenance: "catalogue" }] : [],
    verification: airportCode ? "verified" : "catalogue-only",
    staticCoverage: { flights: "none", hotels: "none", cars: location.kind === "custom" ? "none" : "exact", packages: "none" },
    source,
  };
}
