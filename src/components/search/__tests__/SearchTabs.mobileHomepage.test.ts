import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const mobileStart = source.indexOf('if (mobileHomepage && tab === "flights")');
const desktopStart = source.indexOf("\n  return (", mobileStart);
const mobileBranch = source.slice(mobileStart, desktopStart);
const flightMobileBranch = source.slice(
  mobileStart,
  source.indexOf('if (mobileHomepage && tab === "deals")', mobileStart),
);
const sharedBranch = source.slice(desktopStart);
const tabModeDeclaration = source.slice(source.indexOf("type TabMode"), source.indexOf("type TripType"));

test("homepage scopes the approved presentation to its below-sm SearchTabs", () => {
  assert.match(homepage, /className="page-shell[^\n]*sm:hidden"[\s\S]*?<SearchTabs[\s\S]*?mobileHomepage/);
  assert.match(homepage, /className="page-shell[^\n]*hidden sm:block[^\n]*"[\s\S]*?<SearchTabs[\s\S]*?compactHero/);
  assert.doesNotMatch(homepage.match(/hidden sm:block[\s\S]*?<SearchTabs[\s\S]*?\/>/)?.[0] ?? "", /mobileHomepage/);
});

test("mobile Flights renders four connected product tabs in approved order and is the default", () => {
  assert.match(source, /useState<TabMode>\("flights"\)/);
  assert.match(mobileBranch, /mobile-homepage-product-tabs/);
  assert.match(mobileBranch, /grid-cols-4/);
  assert.match(mobileBranch, /\["flights", Plane,[\s\S]*?\["hotels", Building2,[\s\S]*?\["cars", CarFront,[\s\S]*?\["deals", Tag/);
  assert.equal((flightMobileBranch.match(/^\s*\["(?:flights|hotels|cars|deals)"/gm) ?? []).length, 4);
  assert.match(mobileBranch, /role="tab"[\s\S]*?aria-selected=\{selected\}/);
  assert.match(mobileBranch, /selected && "bg-\[#eef5ff\] text-\[#075ee8\]"/);
});

test("Deals uses the Tag icon and selects the canonical form inline", () => {
  assert.match(mobileBranch, /\["deals", Tag, t\.deals \|\| "Deals"\]/);
  assert.match(tabModeDeclaration, /"deals"/);
  assert.doesNotMatch(mobileBranch, /router\.push\("\/deals"\)/);
  assert.match(source, /tab === "deals"[\s\S]*?<DealsSearchForm variant="landing" presentation="mobile-homepage"/);
  assert.match(source, /aria-selected=\{selected\}/);
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
  assert.match(mobileBranch, /h-1\.5 w-1\.5 rounded-full bg-\[#1670ee\]/);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-trip-selector[^\n]*border/);
});

test("mobile homepage controls use the compact production density without scaling", () => {
  assert.match(mobileBranch, /grid h-11 grid-cols-4/);
  assert.match(mobileBranch, /h-\[68px\][^\n]*mobile-homepage|className="focus-ring flex h-\[68px\]/);
  assert.match(mobileBranch, /h-\[62px\][^\n]*w-full/);
  assert.match(mobileBranch, /h-16 w-full/);
  assert.match(mobileBranch, /h-12 w-full rounded-\[11px\]/);
  assert.doesNotMatch(mobileBranch, /transform:\s*scale|scale-\[/);
});

test("mobile homepage reserved space follows the compact card while desktop offsets stay protected", () => {
  assert.match(homepage, /bottom-\[-460px\][^\n]*sm:hidden/);
  assert.match(homepage, /pt-\[30\.5rem\][^\n]*sm:pt-24/);
  assert.match(homepage, /bottom-\[-52px\][^\n]*hidden sm:block lg:bottom-\[-56px\]/);
});

test("mobile fields omit decorative icon tiles while retaining the wired horizontal swap", () => {
  assert.match(mobileBranch, /mobile-homepage-\$\{kind\}-field/);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-location-icon-tile|<MapPin|<Calendar|<UserRound/);
  assert.equal((mobileBranch.match(/bg-\[#fcfdfe\] px-4 text-start/g) ?? []).length, 3);
  assert.match(mobileBranch, /mobile-homepage-swap/);
  assert.match(mobileBranch, /onClick=\{onSwapAirports\}/);
  assert.match(mobileBranch, /<ArrowRightLeft/);
  assert.doesNotMatch(mobileBranch, /<ArrowUpDown/);
});

test("mobile card, fields, borders, and tabs use the cool-neutral surface hierarchy", () => {
  assert.match(mobileBranch, /border border-\[#dee5ed\] bg-\[#f8fafc\][^\n]*shadow-\[0_8px_22px_rgba\(15,23,42,0\.07\)\]/);
  assert.ok((mobileBranch.match(/border border-\[#dee5ed\] bg-\[#fcfdfe\]/g) ?? []).length >= 5);
  assert.match(mobileBranch, /selected && "bg-\[#eef5ff\] text-\[#075ee8\]"/);
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
  assert.match(sharedBranch, /mobileHomepage \? \([\s\S]*?<Tag[\s\S]*?t\.deals \|\| "Deals"/);
  assert.match(source, /const tabsClassName = cn\([\s\S]*?mobileHomepage[\s\S]*?grid-cols-4/);
  assert.match(sharedBranch, /startRouteProgress\(\);\s*router\.push\("\/deals"\)/);
  assert.doesNotMatch(sharedBranch, /setTab\("deals"\)/);
});
