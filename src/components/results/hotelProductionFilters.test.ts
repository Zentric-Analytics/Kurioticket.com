import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./HotelResultsClient.tsx", import.meta.url), "utf8");

test("wide desktop uses a dedicated 288px rail and smaller screens use the filter dialog", () => {
  assert.match(source, /min-\[1200px\]:grid-cols-\[288px_minmax\(0,1fr\)\]/);
  assert.match(source, /w-\[288px\][^\n]*min-\[1200px\]:block/);
  assert.match(source, /sm:w-\[420px\][^\n]*min-\[1200px\]:hidden/);
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
  assert.match(source, /activeFilterCount > 0 \?\s*\(?\s*<button/);
  assert.match(source, /No matching stays/);
  assert.match(source, /View \$\{sortedVisibleHotels\.length\} matching/);
  assert.match(source, /disabled=\{filterApplying \|\| sortedVisibleHotels\.length === 0\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /event\.key === "Tab"/);
  assert.match(source, /kurioticketHotelFiltersOpen/);
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /env\(safe-area-inset-top\)/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /overflow-y-auto overflow-x-hidden overscroll-contain/);
  assert.match(source, /filters"\} applied/);
  assert.match(source, /bg-slate-950\/35 backdrop-blur-\[1px\]/);
});

test("mobile results expose one filter toolbar and one in-sheet clear action", () => {
  assert.match(source, /hidden min-h-11 gap-2 sm:inline-flex min-\[1200px\]:!hidden/);
  const sheetStart = source.indexOf("ref={mobileFiltersDialogRef}");
  const sheet = source.slice(sheetStart, source.indexOf("</aside>", sheetStart));
  assert.equal((sheet.match(/\{t\("clearAll"\)\}/g) ?? []).length, 1);
  assert.doesNotMatch(sheet, /disabled=\{activeFilterCount === 0\}/);
  assert.match(sheet, /bg-transparent px-0 text-slate-700/);
  assert.match(sheet, /items-center justify-center text-slate-700/);
  assert.match(source, /desktopCompactFilterPlacement === "fixed"/);
  assert.match(source, /<HotelFilters\s+layout="compact"/);
  assert.doesNotMatch(source, /onClearAll=\{resetFilters\}/);
  assert.doesNotMatch(source, /mobileQuickFacilities = \["wifi", "breakfast", "pool"\]/);
  assert.match(source, /overflow-x-auto overscroll-x-contain/);
  assert.match(source, /\[&::-webkit-scrollbar\]:hidden/);
  assert.match(source, /sticky top-\[calc\(3\.5rem\+env\(safe-area-inset-top\)\)\]/);
  assert.match(source, /<span>Filter<\/span>[\s\S]*trigger\("sort", currentSortLabel\)[\s\S]*trigger\(\s*"stars",\s*"Stars"[\s\S]*trigger\(\s*"amenities",\s*"Amenities"/);
  assert.match(source, /type MobileHotelShortcutMenu = "sort" \| "price" \| "stars" \| "amenities"/);
  assert.match(source, /trigger\("price", "Price", priceFilterActive \? 1 : 0\)/);
  assert.match(source, /mobileShortcutDraftMinPrice/);
  assert.match(source, /setMinPrice\(mobileShortcutDraftMinPrice\)/);
  assert.match(source, /role="dialog"[\s\S]*mobile-hotel-\$\{mobileShortcutMenu\}-title/);
  assert.match(source, /mobileShortcutMenu === "stars"[\s\S]*setSelectedHotelClasses\(mobileShortcutDraftStars\)/);
  assert.match(source, /facilities: mobileShortcutDraftFacilities/);
  assert.match(source, /fixed inset-y-0 right-0[^\n]*h-\[100dvh\][^\n]*w-full/);
  assert.match(source, /!guided && !showMobileCompactHotelSearch/);
  assert.match(source, /openMobileShortcutMenu\("sort", event\.currentTarget\)/);
});

test("results omit the superseded comparison disclosure", () => {
  assert.doesNotMatch(source, /Compare property details and estimated prices for your selected stay\. Booking terms appear only when supplied with an offer\./);
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
