import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/NativeFlightDetails.tsx"), "utf8");

test("selected deal drives the information tabs instead of the representative fare offer", () => {
  assert.match(source, /const activeOffer=selectedDeal\?\.offer\?\?offer/);
  assert.match(source, /<FareSurface[^>]*activeOffer=\{activeOffer\}/);
  assert.match(source, /function FareSurface\([^)]*activeOffer/);
  assert.match(source, /const offer=activeOffer,p=offer\.providerDetails/);
});

test("sharing uses the same active selected-deal price shown in the bottom dock", () => {
  assert.match(source, /flightShareMessage\(activeOffer,activePrice\?\.formatted\?\?"price unavailable"\)/);
  assert.doesNotMatch(source, /flightShareMessage\(offer,fare\?\.formatted/);
});
