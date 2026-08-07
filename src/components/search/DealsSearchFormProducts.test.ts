import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const form = readFileSync(
  new URL("./DealsSearchForm.tsx", import.meta.url),
  "utf8",
);
const sync = readFileSync(
  new URL("../../lib/deals/dealsSearchSynchronization.ts", import.meta.url),
  "utf8",
);

test("selector keeps one accessible pressed-button product control", () => {
  assert.equal(form.match(/data-deals-product-selector/g)?.length, 1);
  assert.match(form, /dealsProductOrder\.map/);
  assert.match(form, /aria-pressed=\{selected\}/);
  assert.match(form, /toggleProduct\(product\)/);
  assert.match(form, /tryToggleDealsProduct/);
});

test("all composition and synchronization transitions remain shared", () => {
  for (const helper of [
    "transitionDealsMode",
    "applySharedDestination",
    "applySharedDates",
    "customizeInheritedField",
    "relinkInheritedField",
    "swapFlightAirports",
    "setCarReturnMode",
  ]) {
    assert.match(form, new RegExp(helper));
    assert.match(
      sync,
      new RegExp(`export const ${helper}|export function ${helper}`),
    );
  }
});

test("landing and results use the same DealsSearch object without parallel state", () => {
  assert.doesNotMatch(
    form,
    /resultsFlightOrigin|resultsHotelDestination|resultsCarPickup/,
  );
  assert.match(form, /setSearch\(\(current\)/);
});
