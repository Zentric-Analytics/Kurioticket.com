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

test("KAYAK detail links cannot prefetch and duplicate provider recovery", () => {
  assert.equal((source.match(/prefetch=\{car\.inventorySource === "kayak-sandbox" \? false : undefined\}/g) ?? []).length, 2);
});

test("standalone mobile follows native daily-price and View deal commerce", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-lower-band"),
    source.indexOf("grid-cols-[minmax(0,1.1fr)"),
  );
  assert.doesNotMatch(mobile, /totalDisplayPrice\.formatted|>Total</);
  assert.match(
    mobile,
    /text-\[19px\][^\"]*font-semibold[^\"]*text-\[#07133B\][^\"]*tabular-nums/,
  );
  assert.match(mobile, /dailyDisplayPrice\.formatted/);
  assert.match(mobile, />per day</);
  assert.match(mobile, /View deal <ChevronRight/);
  assert.doesNotMatch(mobile, /bg-\[#004BB8\]/);
  assert.doesNotMatch(mobile, /Taxes and fees included/);
});

test("desktop media fills its column and unsupported tax copy stays hidden", () => {
  const desktop = source.slice(source.indexOf('data-region="image"'));
  assert.match(desktop, /md:aspect-auto md:h-full md:min-h-\[220px\]/);
  assert.doesNotMatch(desktop, /md:p-2\.5/);
  assert.doesNotMatch(source, /Taxes and fees included/);
});

test("desktop save and share glyphs sit closer within independent targets", () => {
  const actions = source.slice(
    source.indexOf("const cardActions"),
    source.indexOf("const mobileCardActions"),
  );
  assert.match(actions, /h-11 w-11/);
  assert.match(actions, /translate-x-1\.5/);
  assert.match(actions, /-translate-x-1\.5/);
});

test("standalone identity separates the semantic model heading from its qualifier", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-information"),
    source.indexOf("data-car-card-mobile-specs"),
  );
  assert.match(mobile, /<h[23][^>]*>\s*\{car\.modelName\}\s*<\/h[23]>/);
  assert.doesNotMatch(mobile, /<h[23][^>]*>\s*\{vehicleName\}\s*<\/h[23]>/);
  assert.match(mobile, /car\.orSimilar \?/);
  assert.match(
    mobile,
    /text-\[11px\] font-medium leading-4 text-\[#536B92\][^>]*>\s*or similar/,
  );
  assert.match(
    mobile,
    /text-\[15px\] font-bold leading-\[18px\]/,
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
    "Automatic",
    "5 doors",
    "3 bags",
  ]);
  const limited = {
    ...car,
    transmission: "manual" as const,
    mileagePolicy: "limited" as const,
    limitedMileageKm: 250,
  };
  assert.deepEqual(
    getMobileCarPrimarySpecs(limited).map(([, label]) => label),
    ["5 passengers", "Manual", "5 doors", "3 bags"],
  );
  assert.equal(getMobileCarPrimarySpecs(limited).length, 4);
});
test("mobile card matches native compact height, spec columns, and top-aligned actions", () => {
  assert.match(source, /data-car-card-mobile-main[\s\S]*?min-h-\[156px\]/);
  assert.doesNotMatch(source, /data-car-card-mobile-main[\s\S]*?min-h-\[168px\]/);
  assert.match(source, /const mobileSpecColumns = \(/);
  assert.match(source, /car\.sandboxPresentation/);
  assert.match(source, /index % 2 === 0/);
  assert.match(source, /index % 2 === 1/);
  assert.match(source, /mobilePrimarySpecs\.slice\(0, 2\)/);
  assert.match(source, /mobilePrimarySpecs\.slice\(2, 4\)/);
  const specs = source.slice(
    source.indexOf("data-car-card-mobile-specs"),
    source.indexOf('className="flex min-w-0 flex-[1.35]', source.indexOf("data-car-card-mobile-specs")),
  );
  assert.match(specs, /px-2 py-2\.5/);
  assert.match(specs, /space-y-2/);
  assert.doesNotMatch(specs, /<li[^>]*py-2\.5/);

  const actions = source.slice(
    source.indexOf("data-car-card-mobile-actions"),
    source.indexOf("return ("),
  );
  assert.equal((actions.match(/items-start justify-center/g) ?? []).length, 2);
  assert.equal((actions.match(/h-11 w-9/g) ?? []).length, 2);
});

test("Free cancellation is data-driven in mobile and secondary benefits stay desktop-only", () => {
  const mobileMain = source.slice(
    source.indexOf("data-car-card-mobile-main"),
    source.indexOf("data-car-card-mobile-lower-band"),
  );
  assert.match(mobileMain, /offer\.freeCancellation &&/);
  assert.match(mobileMain, /Free cancellation/);
  assert.doesNotMatch(
    mobileMain,
    /offer\.payAtPickup|car\.fuelPolicy|Taxes and fees included/,
  );
});

test("desktop and guided contracts retain their responsive grid and owned disclosures", () => {
  assert.match(source, /guidedPlanning \? "grid" : "hidden md:grid"/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
  const desktop = source.slice(source.indexOf('data-region="heading"'));
  assert.doesNotMatch(desktop, /offer\.freeCancellation|offer\.payAtPickup/);
  assert.doesNotMatch(desktop, /Free cancellation|Pay at pickup/);
  assert.doesNotMatch(source, /Unlimited mileage|car\.limitedMileageKm/);
  assert.doesNotMatch(source, /<Fuel|title\(car\.fuelPolicy\)/);
  assert.doesNotMatch(source, /offer\.taxesAndFeesIncluded|Taxes and fees included/);
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
    mobileUtility.indexOf("data-car-card-mobile-identity") <
      mobileUtility.indexOf("{mobileCardActions}"),
  );
  const actions = source.slice(
    source.indexOf("data-car-card-mobile-actions"),
    source.indexOf("return ("),
  );
  assert.doesNotMatch(actions, /car\.modelName\}\s*<\/h[23]>/);
  assert.match(
    mobileUtility,
    /data-car-card-mobile-identity[\s\S]*className="min-w-0"/,
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
  assert.match(actions, /gap-0/);
  assert.equal(
    (actions.match(/h-11 w-9/g) ?? []).length,
    2,
    "save and share each use a 44px by 36px layout box",
  );
  assert.match(
    actions,
    /h-11 w-9[^\n]*before:inset-y-0[^\n]*before:-start-2[^\n]*before:end-0/,
  );
  assert.match(
    actions,
    /h-11 w-9[^\n]*before:inset-y-0[^\n]*before:start-0[^\n]*before:-end-2/,
  );
  assert.match(actions, /<Heart\s+size=\{18\}/);
  assert.match(actions, /<Share2 size=\{18\}/);
  assert.match(actions, /<Heart[\s\S]*?className="translate-x-1"/);
  assert.match(actions, /<Share2 size=\{18\} className="-translate-x-1"/);
  assert.doesNotMatch(actions, /before:-inset-/);
  assert.match(mobileUtility, /flex min-w-0 items-start gap-1\.5/);
  assert.match(
    mobileUtility,
    /data-car-card-mobile-utility-copy[\s\S]*?min-w-0 flex-1 overflow-hidden/,
  );
  assert.match(
    mobileUtility,
    /truncate text-\[10px\][^>]*>\{car\.categoryLabel\}/,
  );
  assert.match(source, /inline-flex min-h-5 shrink-0 items-center gap-1 whitespace-nowrap/);
  assert.match(
    source,
    /data-car-card-mobile-information[\s\S]*?bg-\[#E7EBF1\]/,
  );
});

test("every supported mobile badge keeps its full single-line label", () => {
  const badgeMap = source.slice(
    source.indexOf("const carResultBadgeIcons"),
    source.indexOf("export function CarResultCard"),
  );
  assert.match(badgeMap, /"Best value": Award/);
  assert.match(badgeMap, /Cheapest: Tag/);
  assert.match(badgeMap, /"Top rated": Star/);
  assert.match(source, /shrink-0[^\"]*whitespace-nowrap/);
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
  assert.match(identity, /min-w-0 break-words text-\[15px\]/);
  assert.doesNotMatch(
    identity,
    /data-car-card-mobile-actions|p[er]-\d+|w-\[(?:80|88)px\]/,
  );
});
