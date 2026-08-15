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

test("landing and results share the four direct package choices in exact order", () => {
  assert.equal(form.match(/<div\s+data-deals-package-selector\s/g)?.length, 1);
  const config = form.slice(
    form.indexOf("const dealsPackageOptions"),
    form.indexOf("const desktopLandingPackageOptions"),
  );
  const modes = ["hotel-flight", "flight-car", "hotel-car", "hotel-flight-car"];
  assert.deepEqual(
    [...config.matchAll(/mode: "([^"]+)"/g)].map((match) => match[1]),
    modes,
  );
  assert.match(form, /const selected = search\.mode === option\.mode/);
  assert.match(form, /aria-pressed=\{selected\}/);
  assert.match(form, /selectPackageMode\(option\.mode\)/);
  assert.match(
    form,
    /const selectPackageMode[\s\S]*transitionDealsMode\(current, mode\)/,
  );
  assert.doesNotMatch(form, /useState<DealsPackageMode>/);

  const selector = form.slice(
    form.indexOf("data-deals-package-selector"),
    form.indexOf("<p", form.indexOf("data-deals-package-selector")),
  );
  assert.doesNotMatch(selector, /<BedDouble|<Plane|<Car/);
  assert.match(selector, /data-deals-package-selector-variant=\{variant\}/);
  assert.doesNotMatch(form, /data-deals-product-selector/);
  assert.doesNotMatch(
    selector,
    /toggleProduct\(product\)|tryToggleDealsProduct/,
  );
  assert.doesNotMatch(form, /tryToggleDealsProduct/);
});

test("desktop landing exposes each canonical mode once with exact compact labels", () => {
  const desktopConfig = form.slice(
    form.indexOf("const desktopLandingPackageOptions"),
    form.indexOf("const field"),
  );
  const options = [...desktopConfig.matchAll(
    /\{ id: "([^"]+)", mode: "([^"]+)", text: "([^"]+)" \}/g,
  )].map((match) => match.slice(1));
  assert.deepEqual(options, [
    ["hotel-flight", "hotel-flight", "Flight+Hotel"],
    ["flight-car", "flight-car", "Flight+Car"],
    ["hotel-car", "hotel-car", "Hotel+Car"],
    ["hotel-flight-car", "hotel-flight-car", "Flight+Hotel+Car"],
  ]);
  assert.equal(new Set(options.map(([, mode]) => mode)).size, 4);
  assert.doesNotMatch(desktopConfig, /Hotel \+ Flight|flight-hotel/);
  assert.match(form, /data-deals-canonical-mode=\{option\.mode\}/);
  assert.match(form, /selectPackageMode\(option\.mode\)/);
  assert.doesNotMatch(desktopConfig, /mode: "flight-hotel"/);
});

test("landing-only package normalization remains isolated from results", () => {
  const handler = form.slice(
    form.indexOf("const selectPackageMode"),
    form.indexOf("const openFlightAirport"),
  );
  assert.match(handler, /if \(isLandingVariant\) \{/);
  for (const field of [
    "stayDestination",
    "stayDates",
    "carPickup",
    "carDates",
  ]) {
    assert.match(
      handler,
      new RegExp(`relinkInheritedField\\(next, "${field}"\\)`),
    );
  }
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
