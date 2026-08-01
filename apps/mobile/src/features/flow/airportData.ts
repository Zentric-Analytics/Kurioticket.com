import { airports as globalAirports } from "../../../../../src/data/airports";

/**
 * Mobile compatibility view of the canonical repository airport catalogue.
 * A relative workspace import works in Metro and in the Node test runner;
 * TypeScript's `@/*` alias alone was not sufficient at runtime. This keeps one
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
