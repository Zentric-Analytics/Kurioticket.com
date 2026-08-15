import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const mobileStart = source.indexOf('if (mobileHomepage && tab === "flights")');
const desktopStart = source.indexOf("\n  return (", mobileStart);
const mobileBranch = source.slice(mobileStart, desktopStart);
const sharedBranch = source.slice(desktopStart);

test("homepage scopes the approved presentation to its below-sm SearchTabs", () => {
  assert.match(homepage, /className="page-shell[^\n]*sm:hidden"[\s\S]*?<SearchTabs[\s\S]*?mobileHomepage/);
  assert.match(homepage, /className="page-shell[^\n]*hidden sm:block[^\n]*"[\s\S]*?<SearchTabs[\s\S]*?compactHero/);
  assert.doesNotMatch(homepage.match(/hidden sm:block[\s\S]*?<SearchTabs[\s\S]*?\/>/)?.[0] ?? "", /mobileHomepage/);
});

test("mobile Flights renders the connected product tabs and is the default", () => {
  assert.match(source, /useState<TabMode>\("flights"\)/);
  assert.match(mobileBranch, /mobile-homepage-product-tabs/);
  assert.match(mobileBranch, /\["flights", Plane,[\s\S]*?\["hotels", Building2,[\s\S]*?\["cars", CarFront/);
  assert.match(mobileBranch, /role="tab"[\s\S]*?aria-selected=\{selected\}/);
  assert.match(mobileBranch, /selected && "bg-\[#eef5ff\] text-\[#075ee8\]"/);
});

test("mobile flight controls retain the approved hierarchy", () => {
  const markers = [
    "mobile-homepage-product-tabs",
    "mobile-homepage-trip-selector",
    "mobile-homepage-route-fields",
    "mobile-homepage-travel-dates-field",
    "mobile-homepage-travelers-field",
    "mobile-homepage-search-submit",
  ];
  let previous = -1;
  for (const marker of markers) {
    const index = mobileBranch.indexOf(marker);
    assert.ok(index > previous, `${marker} should retain its approved order`);
    previous = index;
  }
});

test("trip type uses accessible radio-style options", () => {
  assert.match(mobileBranch, /role="radiogroup"/);
  assert.match(mobileBranch, /\["round-trip", "one-way"\]/);
  assert.match(mobileBranch, /role="radio"[\s\S]*?aria-checked=\{selected\}/);
  assert.match(mobileBranch, /h-3 w-3 rounded-full bg-\[#1670ee\]/);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-trip-selector[^\n]*border/);
});

test("route cards use icon tiles and the wired horizontal swap", () => {
  assert.match(mobileBranch, /mobile-homepage-\$\{kind\}-field/);
  assert.equal((mobileBranch.match(/mobile-homepage-location-icon-tile/g) ?? []).length, 1);
  assert.match(mobileBranch, /mobile-homepage-swap/);
  assert.match(mobileBranch, /onClick=\{onSwapAirports\}/);
  assert.match(mobileBranch, /<ArrowRightLeft/);
  assert.doesNotMatch(mobileBranch, /<ArrowUpDown/);
});

test("dates and travelers are single full-width mobile cards", () => {
  assert.equal((mobileBranch.match(/mobile-homepage-travel-dates-field/g) ?? []).length, 1);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-depart|mobile-homepage-return/);
  assert.equal((mobileBranch.match(/mobile-homepage-travelers-field/g) ?? []).length, 1);
  assert.match(mobileBranch, /Travelers & Cabin Class/);
  assert.match(mobileBranch, /\{dateSummary\}/);
  assert.match(mobileBranch, /\{travelerSummary\}/);
});

test("mobile CTA text is exactly Search while preserving submission", () => {
  assert.match(mobileBranch, /onSubmit=\{onFlightSubmit\}/);
  assert.match(mobileBranch, /isFlightSubmitting[\s\S]*?: t\.search \|\| "Search"/);
  assert.doesNotMatch(mobileBranch, />Search flights</);
});

test("mobile pickers and one-way/query behavior remain wired", () => {
  assert.match(mobileBranch, /renderMobileAirportPicker/);
  assert.match(mobileBranch, /renderFlightDateCalendar\(\)/);
  assert.match(mobileBranch, /renderTravelersCabinPicker\(\)/);
  assert.match(source, /if \(mode === "one-way"\) \{\s*setReturnDate\(""\)/);
  assert.match(source, /new URLSearchParams\(\{[\s\S]*?tripType:[\s\S]*?origin:[\s\S]*?destination:/);
  assert.match(source, /tripType ===[\s\S]*?"round-trip"[\s\S]*?params\.set\([\s\S]*?"returnDate"/);
});

test("Hotels and Cars remain switchable without changing desktop structure", () => {
  assert.match(sharedBranch, /setTab\("hotels"\)/);
  assert.match(sharedBranch, /setTab\("cars"\)/);
  assert.match(sharedBranch, /\) : tab === "hotels" \? \(/);
  assert.match(sharedBranch, /\) : \([\s\S]*?onSubmit=\{onCarsSubmit\}/);
  assert.match(sharedBranch, /<Plane[\s\S]*?\{t\.flights\}/);
  assert.match(sharedBranch, /<BedDouble[\s\S]*?\{t\.hotels\}/);
  assert.match(sharedBranch, /<CarFront[\s\S]*?\{t\.cars\}/);
});
