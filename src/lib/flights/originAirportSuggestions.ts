import { airports, getDefaultAirports, type AirportOption } from "@/data/airports";
import { normalizeCountryCode } from "@/lib/geo/context";
import { distanceKm } from "@/lib/geo/distance";
import type { GeoIpLocation } from "@/lib/geo/maxmind";

export type OriginSuggestionLocation = Pick<
  GeoIpLocation,
  "countryCode" | "region" | "city" | "latitude" | "longitude" | "source" | "accuracyType"
>;

const normalizeText = (value?: string | null) =>
  value
    ?.normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase() || "";

const airportDistance = (airport: AirportOption, location: OriginSuggestionLocation) => {
  if (typeof location.latitude !== "number" || typeof location.longitude !== "number") return Number.POSITIVE_INFINITY;
  const airportLatitude = typeof airport.latitude === "number" ? airport.latitude : airport.lat;
  const airportLongitude = typeof airport.longitude === "number" ? airport.longitude : airport.lon;
  if (typeof airportLatitude !== "number" || typeof airportLongitude !== "number") return Number.POSITIVE_INFINITY;

  return distanceKm(location.latitude, location.longitude, airportLatitude, airportLongitude);
};

const airportScore = (airport: AirportOption, location: OriginSuggestionLocation) => {
  const distance = airportDistance(airport, location);
  const distancePenalty = Number.isFinite(distance) ? distance : 1_500;
  const cityBoost = normalizeText(airport.city) === normalizeText(location.city) ? 450 : 0;
  const countryBoost = normalizeCountryCode(airport.countryCode) === normalizeCountryCode(location.countryCode) ? 140 : 0;

  return cityBoost + countryBoost + (airport.priority ?? 50) * 4 - distancePenalty;
};

const sortForLocation = (candidates: AirportOption[], location: OriginSuggestionLocation) =>
  [...candidates].sort((a, b) => airportScore(b, location) - airportScore(a, location));

export const getCityAwareOriginAirports = (location: OriginSuggestionLocation | null | undefined, limit = 8) => {
  if (!location) return getDefaultAirports({ context: "origin", limit });

  const countryCode = normalizeCountryCode(location.countryCode);
  const cityKey = normalizeText(location.city);
  const hasCoordinates = typeof location.latitude === "number" && typeof location.longitude === "number";

  if (hasCoordinates) {
    const nearbyCandidates = airports.filter((airport) => !countryCode || normalizeCountryCode(airport.countryCode) === countryCode);
    return sortForLocation(nearbyCandidates.length ? nearbyCandidates : airports, location).slice(0, limit);
  }

  if (cityKey) {
    const cityMatches = airports.filter(
      (airport) => normalizeText(airport.city) === cityKey && (!countryCode || normalizeCountryCode(airport.countryCode) === countryCode),
    );
    if (cityMatches.length) return sortForLocation(cityMatches, location).slice(0, limit);
  }

  if (countryCode) return getDefaultAirports({ context: "origin", countryCode, limit });

  return getDefaultAirports({ context: "origin", limit });
};

export const prioritizeOriginSuggestions = (
  suggestions: AirportOption[],
  location: OriginSuggestionLocation | null | undefined,
) => {
  if (!location || suggestions.length < 2) return suggestions;
  return sortForLocation(suggestions, location);
};
