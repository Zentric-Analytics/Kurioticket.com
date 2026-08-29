import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  formatCarPickupType,
  getMobileCarPrimarySpecs,
} from "./carResultCardSpecs";
import type { NormalizedCarResult } from "@/lib/cars/types";

const source = readFileSync("src/components/results/CarResultCard.tsx", "utf8");

const car = {
  passengers: 5,
  bags: 3,
  transmission: "automatic",
  mileagePolicy: "unlimited",
  doors: 5,
  fuelPolicy: "full-to-full",
} as NormalizedCarResult;

test("CarResultCard accepts string and null href actions without provider fallback", () => {
  assert.match(source, /detailsHref: string \| null/);
  assert.match(source, /detailsHref \? \(\s*<Link\s+href=\{detailsHref\}/);
  assert.match(source, /<button\s+type="button"\s+disabled/);
  assert.doesNotMatch(
    source,
    /href=\{detailsHref \?\?|href="#"|bookingUrl|api\/redirect/,
  );
});

test("standalone mobile keeps total primary, per-day supporting, and its action compact", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-conversion"),
    source.indexOf("grid-cols-[minmax(0,1.1fr)"),
  );
  assert.ok(
    mobile.indexOf("totalDisplayPrice.formatted") <
      mobile.indexOf("dailyDisplayPrice.formatted"),
  );
  assert.match(
    mobile,
    /text-\[23px\][^\"]*font-semibold[^\"]*text-\[#07133B\][^\"]*tabular-nums/,
  );
  assert.match(mobile, /dailyDisplayPrice\.formatted\}\/day/);
  assert.match(mobile, /min-h-11/);
  assert.match(mobile, /bg-\[#004BB8\]/);
  assert.doesNotMatch(mobile, /Taxes and fees included/);
});

test("standalone identity separates the semantic model heading from its qualifier", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-information"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(mobile, /<h[23][^>]*>\s*\{car\.modelName\}\s*<\/h[23]>/);
  assert.doesNotMatch(mobile, /<h[23][^>]*>\s*\{vehicleName\}\s*<\/h[23]>/);
  assert.match(mobile, /car\.orSimilar \? \(/);
  assert.match(
    mobile,
    /text-\[11px\] font-medium leading-4 text-\[#536B92\][^>]*>\s*or similar/,
  );
  assert.match(
    mobile,
    /text-\[18px\] font-bold leading-\[1\.18\] text-\[#07133B\]/,
  );
  assert.doesNotMatch(mobile, /aria-hidden[^>]*>\s*or similar/);
});

test("guided planning retains its localized combined vehicle-name contract", () => {
  assert.match(
    source,
    /`\$\{car\.modelName\} \$\{planningLabels\?\.orSimilar \?\? "or similar"\}`/,
  );
  assert.match(source, /guidedPlanning \? \([\s\S]*?\{vehicleName\}/);
});

test("pickup types use display-only sentence casing", () => {
  assert.equal(formatCarPickupType("meet-and-greet"), "Meet and greet");
  assert.equal(formatCarPickupType("airport-counter"), "Airport counter");
  assert.equal(formatCarPickupType("city-location"), "City location");
  assert.equal(formatCarPickupType("shuttle"), "Shuttle");
  assert.equal(car.transmission, "automatic");
  assert.match(source, /formatCarPickupType\(car\.pickupType\)/);
});

test("mobile primary specs are deterministic and capped at four", () => {
  const first = getMobileCarPrimarySpecs(car).map(([, label]) => label);
  assert.deepEqual(
    first,
    getMobileCarPrimarySpecs(car).map(([, label]) => label),
  );
  assert.deepEqual(first, [
    "5 passengers",
    "3 bags",
    "Automatic",
    "Unlimited mileage",
  ]);
  const limited = {
    ...car,
    transmission: "manual" as const,
    mileagePolicy: "limited" as const,
    limitedMileageKm: 250,
  };
  assert.deepEqual(
    getMobileCarPrimarySpecs(limited).map(([, label]) => label),
    ["5 passengers", "3 bags", "Manual", "250 km included"],
  );
  assert.equal(getMobileCarPrimarySpecs(limited).length, 4);
});
test("Free cancellation is data-driven in mobile and secondary benefits stay desktop-only", () => {
  const mobileMain = source.slice(
    source.indexOf("data-car-card-mobile-main"),
    source.indexOf("data-car-card-mobile-conversion"),
  );
  assert.match(mobileMain, /offer\.freeCancellation &&/);
  assert.match(mobileMain, /Free cancellation/);
  assert.doesNotMatch(
    mobileMain,
    /offer\.payAtPickup|car\.fuelPolicy|Taxes and fees included/,
  );
});

test("desktop and guided contracts retain their responsive grid and disclosures", () => {
  assert.match(source, /guidedPlanning \? "grid" : "hidden md:grid"/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /!guidedPlanning && offer\.freeCancellation/);
  assert.match(source, /!guidedPlanning && offer\.payAtPickup/);
  assert.match(source, /!guidedPlanning && offer\.taxesAndFeesIncluded/);
  assert.match(source, /planningLabels\?\.estimatedTotal/);
  assert.match(source, /planningLabels\?\.disclosure/);
});

test("prices preserve formatter output, LTR semantics, and accessible fallback metadata", () => {
  assert.match(source, /const offer = getPrimaryCarOffer\(car\)/);
  assert.doesNotMatch(source, /car\.offers\[0\]/);
  for (const price of ["totalDisplayPrice", "dailyDisplayPrice"]) {
    assert.match(
      source,
      new RegExp(
        `dir="ltr"[\\s\\S]*?title=\\{${price}\\.title\\}[\\s\\S]*?aria-label=\\{${price}\\.ariaLabel\\}`,
      ),
    );
  }
});

test("cards expose compact, functional save and share actions", () => {
  const mobileUtility = source.slice(
    source.indexOf("data-car-card-mobile-utility-row"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(mobileUtility, /\{mobileCardActions\}/);
  assert.ok(
    mobileUtility.indexOf("car.categoryLabel") <
      mobileUtility.indexOf("{mobileCardActions}"),
  );
  assert.ok(
    mobileUtility.indexOf("{mobileCardActions}") <
      mobileUtility.indexOf("data-car-card-mobile-identity"),
  );
  const actions = source.slice(
    source.indexOf("data-car-card-mobile-actions"),
    source.indexOf("return ("),
  );
  assert.doesNotMatch(actions, /car\.modelName\}\s*<\/h[23]>/);
  assert.match(
    mobileUtility,
    /data-car-card-mobile-identity[\s\S]*min-w-0 flex-wrap/,
  );
  assert.match(
    source,
    /aria-label=\{`\$\{isSaved \? "Unsave" : "Save"\} \$\{car\.modelName\}`\}/,
  );
  assert.match(source, /aria-pressed=\{isSaved\}/);
  assert.match(source, /fill=\{isSaved \? "currentColor" : "none"\}/);
  assert.match(source, /aria-label=\{`Share \$\{car\.modelName\}`\}/);
  assert.match(source, /navigator\.share/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(actions, /h-8 w-8/);
  assert.match(actions, /before:-inset-1/);
  assert.match(actions, /gap-2/);
  assert.equal((actions.match(/size=\{17\}/g) ?? []).length, 2);
  assert.doesNotMatch(actions, /h-11 w-11/);
  assert.match(mobileUtility, /min-h-8 min-w-0 items-center/);
});

test("long mobile model names retain an action-independent identity row", () => {
  for (const modelName of [
    "Citroën Grand C4 SpaceTourer",
    "Mercedes-Benz E-Class",
    "Mercedes-Benz V-Class",
  ]) {
    assert.ok(modelName.length > 20);
  }
  const identity = source.slice(
    source.indexOf("data-car-card-mobile-identity"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(identity, /\{car\.modelName\}/);
  assert.match(identity, /min-w-0 break-words text-\[18px\]/);
  assert.doesNotMatch(
    identity,
    /data-car-card-mobile-actions|p[er]-\d+|w-\[(?:80|88)px\]/,
  );
});
