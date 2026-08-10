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

test("landing selector exposes the four direct package choices in exact order", () => {
  assert.equal(form.match(/data-deals-package-selector/g)?.length, 1);
  const config = form.slice(
    form.indexOf("const landingPackageOptions"),
    form.indexOf("const field"),
  );
  const modes = ["hotel-flight", "flight-car", "hotel-car", "hotel-flight-car"];
  assert.deepEqual(
    [...config.matchAll(/mode: "([^"]+)"/g)].map((match) => match[1]),
    modes,
  );
  assert.match(form, /const selected = search\.mode === option\.mode/);
  assert.match(form, /aria-pressed=\{selected\}/);
  assert.match(form, /selectLandingPackage\(option\.mode\)/);
  assert.match(
    form,
    /const selectLandingPackage[\s\S]*transitionDealsMode\(current, mode\)/,
  );
  assert.doesNotMatch(form, /useState<DealsPackageMode>/);

  const selector = form.slice(
    form.indexOf("data-deals-package-selector"),
    form.indexOf(") : (", form.indexOf("data-deals-package-selector")),
  );
  assert.doesNotMatch(selector, /<BedDouble|<Plane|<Car/);
});

test("results selector retains accessible independent product toggles", () => {
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

test("English package labels preserve the requested display order", () => {
  const translations = readFileSync(
    new URL("../../lib/i18n/en.ts", import.meta.url),
    "utf8",
  );
  const entries = [
    ["deals.package.hotelFlight", "Hotel + Flight"],
    ["deals.package.flightCar", "Flight + Car"],
    ["deals.package.hotelCar", "Hotel + Car"],
    ["deals.package.hotelFlightCar", "Hotel + Flight + Car"],
  ];
  const positions = entries.map(([key, value]) =>
    translations.indexOf(`"${key}": "${value}"`),
  );
  assert.ok(positions.every((position) => position >= 0));
  assert.equal(new Set(positions).size, entries.length);
});
