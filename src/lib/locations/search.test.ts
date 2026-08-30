import assert from "node:assert/strict";
import test from "node:test";
import type { CanonicalLocation } from "./types";
import { normalizeLocationText, searchLocations } from "./search";

const location = (overrides: Partial<CanonicalLocation>): CanonicalLocation => ({
  id: "airport:LOS", kind: "airport", primaryLabel: "Lagos (LOS)",
  supportingLabel: "Murtala Muhammed International Airport", submittedValue: "LOS",
  country: { code: "NG", name: "Nigeria" }, codes: { iata: "LOS" }, aliases: ["Ikeja Airport"],
  staticCoverage: { flights: "reference-only", hotels: "none", cars: "reference-only", packages: "reference-only" },
  source: { catalog: "kurioticket", datasetVersion: "test" }, ...overrides,
});

test("normalization handles accents and punctuation", () => {
  assert.equal(normalizeLocationText("  Montréal—Trudeau  "), "montreal trudeau");
});

test("ranking prefers exact code then exact label", () => {
  const matches = searchLocations([location({}), location({ id: "city:LOS", codes: undefined, primaryLabel: "Los", submittedValue: "Los" })], "LOS");
  assert.deepEqual(matches.map(({ match }) => match.location.id), ["airport:LOS", "city:LOS"]);
});

test("matches aliases and bounded single-edit typos but not short fuzzy input", () => {
  assert.equal(searchLocations([location({})], "Ikeja")[0]?.match.location.id, "airport:LOS");
  assert.equal(searchLocations([location({ primaryLabel: "Houston", submittedValue: "Houston" })], "houstn")[0]?.match.tier, "typo");
  assert.equal(searchLocations([location({ primaryLabel: "Paris", submittedValue: "Paris" })], "prs").length, 0);
});
