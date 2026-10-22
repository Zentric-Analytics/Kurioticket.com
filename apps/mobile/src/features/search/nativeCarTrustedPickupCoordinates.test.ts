import assert from "node:assert/strict";
import test from "node:test";
import { nativeCarTrustedPickupCoordinates } from "./nativeCarDetailsModel";

test("resolves only exact, owned airport identities", () => {
  const expected = { latitude: 49.0097, longitude: 2.5479 };
  assert.deepEqual(nativeCarTrustedPickupCoordinates("Charles de Gaulle Airport (CDG)"), expected);
  assert.deepEqual(nativeCarTrustedPickupCoordinates("  cdg  "), expected);
  assert.deepEqual(nativeCarTrustedPickupCoordinates("Paris Charles de Gaulle Airport"), expected);
});

test("does not infer an airport from cities, rental areas, addresses, or suffixes", () => {
  for (const location of [
    "Paris, France",
    "Paris City Centre, Paris",
    "Montparnasse, Paris",
    "La Défense, Paris",
    "Central London",
    "Manhattan",
    "15 Example Road, Lagos",
    "unknown custom text",
    "Completely Different Place (CDG)",
  ]) assert.equal(nativeCarTrustedPickupCoordinates(location), null, location);
});
