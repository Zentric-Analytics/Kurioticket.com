import assert from "node:assert/strict";
import test from "node:test";
import { nativeCarTrustedMapCoordinates } from "./nativeCarMapReferences";

test("uses the reviewed Paris city reference without inferring an airport", () => {
  const paris = nativeCarTrustedMapCoordinates("Paris, France");
  assert.deepEqual(paris, { latitude: 48.85341, longitude: 2.3488 });
  assert.notDeepEqual(paris, { latitude: 49.0097, longitude: 2.5479 });
});

test("still resolves exact trusted airport pickup identities", () => {
  assert.deepEqual(nativeCarTrustedMapCoordinates("Charles de Gaulle Airport (CDG)"), {
    latitude: 49.0097,
    longitude: 2.5479,
  });
});

test("fails closed for custom text and airport-code suffixes", () => {
  for (const location of [
    "15 Example Road, Paris",
    "15 Example Road, Lagos",
    "unknown custom text",
    "Completely Different Place (CDG)",
  ]) assert.equal(nativeCarTrustedMapCoordinates(location), null, location);
});
