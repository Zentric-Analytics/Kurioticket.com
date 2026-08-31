import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");

test("wide desktop uses a dedicated 288px rail and smaller screens use the filter dialog", () => {
  assert.match(source, /min-\[1200px\]:grid-cols-\[288px_minmax\(0,1fr\)\]/);
  assert.match(source, /w-\[288px\][^\n]*min-\[1200px\]:block/);
  assert.match(source, /sm:w-\[420px\] min-\[1200px\]:hidden/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /max-width: 1199px/);
});

test("facets follow the production hierarchy and omit cancellation claims", () => {
  const price = source.indexOf('title={t("hotelResults.budgetPrice")}');
  const hotelClass = source.indexOf('title="Hotel class"', price);
  const area = source.indexOf('title={t("hotelResults.locationArea")}', hotelClass);
  const property = source.indexOf('title={t("hotelResults.propertyType")}', area);
  const amenities = source.indexOf('title={t("hotelResults.facilities")}', property);
  const room = source.indexOf('title="Room & bed"', amenities);
  assert.ok(price < hotelClass && hotelClass < area && area < property && property < amenities && amenities < room);
  assert.match(source, /section\.id !== "cancellationPolicies"/);
});

test("hotel class is multi-select and empty selection means all", () => {
  assert.match(source, /selectedHotelClasses: number\[\]/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /selectedHotelClasses\.length === 0/);
  assert.doesNotMatch(source, /Any property type|Any room type/);
});

test("price filters share the static estimated-total basis", () => {
  assert.match(source, /Minimum estimated stay total/);
  assert.match(source, /Maximum estimated stay total/);
  assert.match(source, /Estimated total for \{stayNights\}/);
  assert.match(source, /total >= minPrice && total <= maxPrice/);
  assert.match(source, /kind: "priceRange"/);
});

test("filter sheet exposes clear and deterministic result apply feedback", () => {
  assert.match(source, /disabled=\{activeFilterCount === 0\}/);
  assert.match(source, /Show \{sortedVisibleHotels\.length\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /env\(safe-area-inset-top\)/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /overflow-y-auto overflow-x-hidden overscroll-contain/);
  assert.match(source, /Applied filters/);
  assert.match(source, /bg-slate-950\/35 backdrop-blur-\[1px\]/);
});

test("results omit the superseded comparison disclosure", () => {
  assert.doesNotMatch(
    source,
    /Compare property details and estimated prices for your selected stay\. Booking terms appear only when supplied with an offer\./,
  );
});

test("property search is shared, normalized and represented as an active filter", () => {
  assert.match(source, /Property name/);
  assert.match(source, /placeholder="Search properties"/);
  assert.match(source, /normalize\("NFKD"\)/);
  assert.match(source, /kind: "propertySearch"/);
  assert.match(source, /Clear property search/);
  assert.match(source, /title="Good for your trip"/);
  assert.doesNotMatch(source, /title="Popular"/);
});
