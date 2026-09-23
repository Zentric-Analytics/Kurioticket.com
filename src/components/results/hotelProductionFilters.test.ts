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
  const price = source.indexOf('title={layout === "mobile" ? "Budget / Price"');
  const hotelClass = source.indexOf('title={layout === "mobile" && locale.startsWith("en") ? "Hotel class"', price);
  const area = source.indexOf('title={layout === "mobile" ? "Area"', hotelClass);
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
  assert.match(source, /aria-label=\{minimumAriaLabel\}/);
  assert.match(source, /aria-label=\{maximumAriaLabel\}/);
  assert.match(source, /totalLabel = t\("hotelResults.estimatedStayTotal"\)/);
  assert.match(source, /Intl.NumberFormat\(locale\).format\(stayNights\)/);
  assert.match(source, /total >= minPrice && total <= maxPrice/);
  assert.match(source, /kind: "priceRange"/);
});

test("mobile Hotel full filter keeps the Native full-screen shell and control dimensions", () => {
  const sheetStart = source.indexOf('aria-label="Hotel filters"');
  const sheetEnd = source.indexOf("</aside>", sheetStart);
  const sheet = source.slice(sheetStart, sheetEnd);

  assert.match(sheet, /fixed inset-0[^"]*h-\[100dvh\][^"]*rounded-none[^"]*bg-\[#F2F4F8\]/);
  assert.match(sheet, /min-h-\[76px\]/);
  assert.match(sheet, /text-\[20px\] font-bold leading-\[26px\]/);
  assert.match(sheet, /px-6 pb-8 pt-4/);
  assert.match(sheet, /h-\[49px\] min-w-\[116px\]/);
  assert.match(sheet, /min-h-\[50px\][^"]*bg-\[#0754F7\]/);
  assert.doesNotMatch(sheet, /h-\[95dvh\]|rounded-t-\[20px\]/);
});

test("mobile Hotel filter controls retain Native row, checkbox, input, and section geometry", () => {
  assert.match(source, /max-sm:text-\[16px\] max-sm:font-bold max-sm:leading-\[22px\]/);
  assert.match(source, /min-h-\[46px\][^"]*text-\[14px\][^"]*font-normal[^"]*leading-5/);
  assert.match(source, /h-5 w-5 rounded-\[4px\]/);
  assert.match(source, /border-\[#0754F7\] bg-\[#0754F7\] text-white/);
  assert.match(source, /h-11 w-full appearance-none rounded-\[10px\] border border-\[#D8DEE8\]/);
  assert.match(source, /space-y-6 bg-transparent/);
  assert.match(source, /gap-\[5px\]/);
});


test("filter sheet exposes clear and deterministic result apply feedback", () => {
  assert.match(source, /activeFilterCount > 0 \?\s*\(?\s*<button/);
  assert.match(source, /t\("hotelResults.noStaysMatchFiltersTitle"\)/);
  assert.match(source, /t\("deals.results.package.view.hotel"\)/);
  assert.match(source, /Intl.NumberFormat\(locale\).format\(sortedVisibleHotels.length\)/);
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
  assert.match(source, /Refine results[\s\S]*id="desktop-compact-hotel-filters"[\s\S]*aria-label="Refine hotel results"[\s\S]*<HotelFilters layout="compact"/);
  assert.match(source, /role="region" aria-label="Refine hotel results"/);
  assert.doesNotMatch(source, /aria-label="Close desktop filters"|aria-modal="true" aria-label="Desktop hotel filters"/);
  assert.match(source, /document\.addEventListener\("pointerdown", handlePointerDown\)/);
  assert.doesNotMatch(source, /onClearAll=\{resetFilters\}/);
  assert.doesNotMatch(source, /mobileQuickFacilities = \["wifi", "breakfast", "pool"\]/);
  assert.match(source, /overflow-x-auto overscroll-x-contain/);
  assert.match(source, /\[&::-webkit-scrollbar\]:hidden/);
  assert.match(source, /<span>Filter<\/span>[\s\S]*trigger\("price", "Price"[\s\S]*trigger\(\s*"stars",\s*"Stars"[\s\S]*trigger\(\s*"amenities",\s*"Facilities"/);
  assert.match(source, /type MobileHotelShortcutMenu = "price" \| "stars" \| "amenities"/);
  assert.match(source, /trigger\("price", "Price", priceFilterActive \? 1 : 0\)/);
  assert.match(source, /mobileShortcutDraftMinPrice/);
  assert.match(source, /setMinPrice\(mobileShortcutDraftMinPrice\)/);
  assert.match(source, /role="dialog"[\s\S]*mobile-hotel-\$\{mobileShortcutMenu\}-title/);
  assert.match(source, /mobileShortcutMenu === "stars"[\s\S]*setSelectedHotelClasses\(mobileShortcutDraftStars\)/);
  assert.match(source, /facilities: mobileShortcutDraftFacilities/);
  assert.match(source, /fixed inset-0[^\n]*h-\[100dvh\][^\n]*w-full/);
  assert.doesNotMatch(source, /mobileResultsSearch=/);
  assert.match(source, /h-\[4\.25rem\][\s\S]*max-w-\[30rem\]/);
  assert.doesNotMatch(source, /trigger\("sort",/);
  assert.doesNotMatch(source, /transition-all duration-200 sm:hidden/);
  assert.match(source, /bg-\[#F5F7FB\] px-1 pb-0 pt-10 sm:hidden/);
  assert.match(source, /page-shell grid gap-y-5 pb-6 pt-4 sm:pt-6/);
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
