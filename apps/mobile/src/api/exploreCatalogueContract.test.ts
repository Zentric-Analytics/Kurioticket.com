import assert from "node:assert/strict";
import test from "node:test";
import { parseMobileExploreCatalogue } from "./exploreCatalogueContract";

const destination = (id: string, relatedDestinationIds: string[] = []) => ({
  id,
  name: id,
  country: "Nigeria",
  countryCode: "NG",
  primaryAirportCode: "LOS",
  airportCodes: ["LOS"],
  airportNames: ["Murtala Muhammed International Airport"],
  searchAliases: [id],
  imageDestinationId: id,
  imageUrl: null,
  summary: "Summary",
  description: "Description",
  highlights: ["Food", "Arts", "Waterfront"],
  relatedDestinationIds,
});

const catalogue = () => ({
  version: "2026-08-12T12:00:00.000Z",
  regions: [
    {
      id: "africa",
      name: "Africa",
      slug: "africa",
      destinations: [destination("ng-lagos"), destination("ng-abuja", ["ng-lagos"])],
    },
  ],
});

test("Explore catalogue contract accepts a complete public catalogue", () => {
  assert.deepEqual(parseMobileExploreCatalogue(catalogue()), catalogue());
});

test("Explore catalogue contract rejects a live payload with no destinations", () => {
  assert.equal(parseMobileExploreCatalogue({ version: "2026-08-12T12:00:00.000Z", regions: [] }), null);

  const value = catalogue();
  value.regions[0]!.destinations = [];
  assert.equal(parseMobileExploreCatalogue(value), null);
});

test("Explore catalogue contract rejects duplicate destination IDs", () => {
  const value = catalogue();
  value.regions[0]!.destinations.push(destination("ng-lagos"));
  assert.equal(parseMobileExploreCatalogue(value), null);
});

test("Explore catalogue contract rejects related destination IDs outside the public payload", () => {
  const value = catalogue();
  value.regions[0]!.destinations[0]!.relatedDestinationIds = ["hidden-destination"];
  assert.equal(parseMobileExploreCatalogue(value), null);
});

test("Explore catalogue contract rejects incomplete destination records", () => {
  const value = catalogue() as unknown as { regions: Array<{ destinations: Array<Record<string, unknown>> }> };
  delete value.regions[0]!.destinations[0]!.airportCodes;
  assert.equal(parseMobileExploreCatalogue(value), null);
});
