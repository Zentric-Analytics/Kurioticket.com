import { airports as globalAirports } from "../../../../../src/data/airports";

/**
 * Mobile compatibility view of the canonical repository airport catalogue.
 * Metro is configured in apps/mobile/metro.config.js to watch the repository
 * root, while Node tests resolve this relative import directly. This keeps one
 * airport seed source. New destination behavior belongs in destinationCatalogue.
 */
export type Airport = {
  code: string;
  city: string;
  country: string;
  countryCode: string;
  airport: string;
  priority: number;
};

export const airports: readonly Airport[] = globalAirports.map((airport) => ({
  code: airport.code,
  city: airport.city,
  country: airport.country ?? airport.countryCode ?? "Unknown",
  countryCode: airport.countryCode ?? "",
  airport: airport.airport,
  priority: airport.priority ?? 0,
}));
