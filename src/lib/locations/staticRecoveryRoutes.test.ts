import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("hotel suggestions expose canonical static truth without live-availability claims", () => {
  const source = read("../../app/api/hotels/destinations/route.ts");
  assert.match(source, /canonicalLocations/);
  assert.match(source, /product: "hotels"/);
  assert.match(source, /allowUnverifiedText: false/);
  assert.match(source, /isLiveAvailability: false/);
});

test("car suggestions distinguish owned coverage from permissive unverified text", () => {
  const source = read("../../app/api/cars/locations/route.ts");
  assert.match(source, /location\.kind !== "custom"/);
  assert.match(source, /product: "cars"/);
  assert.match(source, /allowUnverifiedText: true/);
  assert.match(source, /isLiveAvailability: false/);
});
