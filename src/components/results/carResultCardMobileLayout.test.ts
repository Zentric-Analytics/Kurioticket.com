import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarResultCard.tsx", import.meta.url),
  "utf8",
);
const between = (startMarker: string, endMarker: string) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
};

test("standalone mobile uses a marked 40/60 image and information row", () => {
  const main = between(
    "data-car-card-mobile-main",
    "data-car-card-mobile-conversion",
  );
  assert.match(main, /grid-cols-\[40%_minmax\(0,1fr\)\]/);
  assert.match(main, /data-car-card-mobile-image/);
  assert.match(main, /data-car-card-mobile-information/);
  assert.match(main, /fit="cover"/);
  assert.match(main, /sizes="\(max-width: 767px\) 40vw, 250px"/);
  assert.doesNotMatch(main, /col-span-2/);
});

test("mobile identity and exactly four readable primary specs live beside the image", () => {
  const main = between(
    "data-car-card-mobile-main",
    "data-car-card-mobile-conversion",
  );
  assert.match(main, /\{car\.categoryLabel\}/);
  assert.match(main, /\{badge && BadgeIcon &&/);
  assert.match(main, /text-\[18px\]/);
  assert.match(main, /<MapPin/);
  assert.match(main, /\{car\.pickupLocation\}/);
  assert.match(main, /data-car-card-mobile-specs/);
  assert.match(main, /grid-cols-2/);
  assert.match(source, /rounded-\[13px\][^"]*md:rounded-2xl/);
  assert.match(
    source,
    /const mobilePrimarySpecs = getMobileCarPrimarySpecs\(car\)/,
  );
});

test("mobile conversion strip is full width, divided once, and retains accessible pricing/action", () => {
  const conversion = between(
    "data-car-card-mobile-conversion",
    'guidedPlanning ? "grid"',
  );
  assert.match(conversion, /border-t/);
  assert.match(conversion, /totalDisplayPrice\.formatted/);
  assert.match(conversion, /dailyDisplayPrice\.formatted/);
  assert.match(conversion, /dir="ltr"/);
  assert.match(conversion, /min-h-11/);
  assert.match(conversion, /focus-visible:ring-2/);
  assert.doesNotMatch(conversion, /Taxes and fees included/);
});

test("legacy composition is hidden only for standalone mobile and desktop widths remain frozen", () => {
  assert.match(source, /guidedPlanning \? "grid" : "hidden md:grid"/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\]/);
  assert.match(source, /xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]/);
  const desktopImage = between('data-region="image"', 'data-region="heading"');
  assert.match(desktopImage, /md:col-span-1 md:col-start-1 md:row-span-2/);
});

test("offer selection and semantic card ownership remain unchanged", () => {
  assert.equal((source.match(/<article\b/g) ?? []).length, 1);
  assert.match(source, /const offer = getPrimaryCarOffer\(car\)/);
  assert.match(source, /if \(!offer\) return null/);
  assert.doesNotMatch(source, /car\.offers\[0\]/);
});
