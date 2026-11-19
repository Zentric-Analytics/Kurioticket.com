import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./CarResultCard.tsx", import.meta.url),
  "utf8",
);
const hotelSource = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);

const between = (startMarker: string, endMarker: string) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
};

test("mobile Cars card keeps white parity while desktop now also uses pure white", () => {
  const mobile = source.slice(
    source.indexOf("data-car-card-mobile-main"),
    source.indexOf('data-region="image"'),
  );
  const hotelDetails = hotelSource.slice(hotelSource.indexOf("data-hotel-card-details"));
  assert.match(hotelDetails, /data-hotel-card-details\s+className="[^"]*bg-white/);
  assert.match(source, /rounded-\[13px\] border border-\[#D8E1EC\] bg-white shadow/);
  assert.match(mobile, /data-car-card-mobile-image\s+className="[^"]*bg-white p-1\.5"/);
  assert.match(mobile, /data-car-card-mobile-information\s+className="[^"]*bg-white px-2\.5/);
  assert.match(mobile, /data-car-card-mobile-lower-band\s+className="[^"]*border-t border-\[#CBD5E1\] bg-white"/);
  assert.doesNotMatch(mobile, /bg-\[#E7EBF1\]/);
  assert.match(source, /md:rounded-2xl md:bg-white md:shadow/);
  assert.match(mobile, /<CarDealPicker/);
  assert.doesNotMatch(mobile, /data-car-card-mobile-pricing|dailyDisplayPrice\.formatted/);
});

test("standalone mobile uses a marked 40/60 image and information row", () => {
  const main = between(
    "data-car-card-mobile-main",
    "data-car-card-mobile-lower-band",
  );
  assert.match(main, /grid-cols-\[40%_minmax\(0,1fr\)\]/);
  assert.match(main, /data-car-card-mobile-image/);
  assert.match(main, /min-h-\[144px\][^\"]*rounded-\[10px\]/);
  assert.match(main, /data-car-card-mobile-information/);
  assert.match(main, /fit="cover"/);
  assert.match(main, /sizes="\(max-width: 767px\) 40vw, 250px"/);
  assert.doesNotMatch(main, /col-span-2/);
});

test("mobile identity and four spec slots sit below cancellation beside the image", () => {
  const main = between(
    "data-car-card-mobile-main",
    "data-car-card-mobile-lower-band",
  );
  assert.match(main, /\{car\.categoryLabel\}/);
  assert.match(main, /\{mobileBadgeLabel && MobileBadgeIcon \? \(/);
  assert.match(main, /text-\[15px\]/);
  assert.match(main, /<MapPin/);
  assert.match(main, /\{car\.pickupLocation\}/);
  assert.doesNotMatch(main, /formatCarPickupType\(car\.pickupType\)/);
  assert.match(main, /data-car-card-mobile-cancellation/);
  assert.match(main, /data-car-card-mobile-specs/);
  assert.match(main, /grid min-w-0 grid-cols-2 gap-x-2/);
  assert.ok(
    main.indexOf("data-car-card-mobile-specs") > main.indexOf("data-car-card-mobile-cancellation"),
    "vehicle specs must follow cancellation in the right-hand information panel",
  );
  assert.match(main, /mobileSpecColumns\.map/);
  const lowerBand = between(
    "data-car-card-mobile-lower-band",
    'className={`${guidedPlanning ? "grid',
  );
  assert.match(lowerBand, /data-car-card-mobile-offers/);
  assert.doesNotMatch(lowerBand, /data-car-card-mobile-specs|mobileSpecColumns\.map/);
  assert.match(source, /rounded-\[13px\][^"]*md:rounded-2xl/);
  assert.match(
    source,
    /const mobilePrimarySpecs = car\.sandboxPresentation\s*\? getMobileProviderCarSpecSlots\(car\.sandboxPresentation\.specs\)\s*: getMobileCarPrimarySpecs\(car\)/,
  );
});

test("mobile lower band uses all available width for supplier offers without duplicate main pricing", () => {
  const conversion = between(
    "data-car-card-mobile-lower-band",
    'className={`${guidedPlanning ? "grid',
  );
  assert.match(conversion, /border-t border-\[#CBD5E1\] bg-white/);
  assert.match(conversion, /data-car-card-mobile-offers\s+className="w-full min-w-0 px-2 py-1\.5"/);
  assert.doesNotMatch(conversion, /data-car-card-mobile-pricing|dailyDisplayPrice\.formatted|mobileStandaloneViewDeal/);
  assert.doesNotMatch(conversion, /flex-\[2\.65\]|flex-\[1\.1\]|transition-\[flex-grow\]/);
  assert.equal((conversion.match(/<CarDealPicker/g) ?? []).length, 1);
  assert.match(conversion, /expanded=\{offersExpanded\}/);
  assert.match(conversion, /onExpandedChange=\{handleOffersExpandedChange\}/);
  assert.doesNotMatch(source, /const mobileStandaloneViewDealClassName|const mobileStandaloneViewDealVisualStyle/);
});

test("legacy tablet and guided layout remain intact while standalone desktop uses only two columns", () => {
  assert.match(source, /guidedPlanning \? "grid lg:grid-cols-\[250px_minmax\(0,1fr\)_205px\] xl:grid-cols-\[270px_minmax\(0,1fr\)_205px\]" : "hidden md:grid lg:grid-cols-\[192px_minmax\(0,1fr\)\] xl:grid-cols-\[200px_minmax\(0,1fr\)\]"/);
  assert.match(source, /md:grid-cols-\[250px_minmax\(0,1fr\)\]/);
  assert.match(source, /lg:grid-cols-\[192px_minmax\(0,1fr\)\]/);
  assert.match(source, /xl:grid-cols-\[200px_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(source, /lg:grid-cols-\[192px_minmax\(0,1fr\)_152px\]/);
  assert.match(source, /"lg:!hidden"/);
  const desktopImage = between('data-region="image"', 'data-region="heading"');
  assert.match(desktopImage, /md:col-span-1 md:col-start-1 md:row-span-2/);
  assert.match(desktopImage, /lg:row-span-1 lg:border-e-0 lg:items-start/);
});

test("offer selection and semantic card ownership remain unchanged", () => {
  assert.equal((source.match(/<article\b/g) ?? []).length, 1);
  assert.match(source, /const primaryOffer = getPrimaryCarOffer\(car\)/);
  assert.match(source, /const offer =\s*car\.offers\.find\(\(candidate\) => candidate\.id === selectedOfferId\) \?\?\s*primaryOffer/);
  assert.match(source, /if \(!offer\) return null/);
  assert.doesNotMatch(source, /car\.offers\[0\]/);
});
