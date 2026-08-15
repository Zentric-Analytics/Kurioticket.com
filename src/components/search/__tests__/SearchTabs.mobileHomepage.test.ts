import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/search/SearchTabs.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const rendererStart = source.indexOf("const mobileHomepageProductTabs = (");
const mobileStart = source.indexOf('if (mobileHomepage && tab === "flights")', rendererStart);
const desktopStart = source.indexOf("\n  return (", mobileStart);
const mobileProductTabs = source.slice(rendererStart, mobileStart);
const mobileBranch = source.slice(rendererStart, desktopStart);
const flightMobileBranch = source.slice(
  mobileStart,
  source.indexOf('if (mobileHomepage && tab === "deals")', mobileStart),
);
const sharedBranch = source.slice(desktopStart);
const tabModeDeclaration = source.slice(source.indexOf("type TabMode"), source.indexOf("type TripType"));
const hotelDestinationField = source.slice(
  source.indexOf('data-testid={mobileHomepage ? "mobile-homepage-hotel-destination"'),
  source.indexOf('data-testid={mobileHomepage ? "mobile-homepage-hotel-dates"'),
);
const hotelDestinationHomepageValue = hotelDestinationField.slice(
  hotelDestinationField.indexOf("{mobileHomepage ? ("),
  hotelDestinationField.indexOf(") : (", hotelDestinationField.indexOf('data-testid="mobile-homepage-hotel-destination-value"')),
);
const hotelGuestsField = source.slice(
  source.indexOf('data-testid={mobileHomepage ? "mobile-homepage-hotel-guests"'),
  source.indexOf('data-testid={mobileHomepage ? "mobile-homepage-hotel-search"'),
);

test("homepage scopes the approved presentation to its below-sm SearchTabs", () => {
  assert.match(homepage, /className="page-shell[^\n]*sm:hidden"[\s\S]*?<SearchTabs[\s\S]*?mobileHomepage/);
  assert.match(homepage, /className="page-shell[^\n]*hidden sm:block[^\n]*"[\s\S]*?<SearchTabs[\s\S]*?compactHero/);
  assert.doesNotMatch(homepage.match(/hidden sm:block[\s\S]*?<SearchTabs[\s\S]*?\/>/)?.[0] ?? "", /mobileHomepage/);
});

test("mobile Flights renders four connected product tabs in approved order and is the default", () => {
  assert.match(source, /useState<TabMode>\("flights"\)/);
  assert.match(mobileBranch, /mobile-homepage-product-tabs/);
  assert.match(mobileProductTabs, /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_minmax\(0,0\.88fr\)_minmax\(0,1\.22fr\)\]/);
  assert.match(mobileBranch, /\["flights", Plane,[\s\S]*?\["hotels", Building2,[\s\S]*?\["cars", CarFront,[\s\S]*?\["deals", PackagesIcon/);
  assert.equal((mobileProductTabs.match(/^\s*\["(?:flights|hotels|cars|deals)"/gm) ?? []).length, 4);
  assert.match(mobileBranch, /role="tab"[\s\S]*?aria-selected=\{selected\}/);
  assert.match(mobileBranch, /selected && "bg-\[#eef5ff\] text-\[#075ee8\]"/);
});

test("Packages uses the canonical icon and selects the canonical form inline", () => {
  assert.match(mobileProductTabs, /\["deals", PackagesIcon, t\.deals \|\| "Packages"\]/);
  assert.match(tabModeDeclaration, /"deals"/);
  assert.doesNotMatch(mobileBranch, /router\.push\("\/packages"\)/);
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
  assert.match(mobileBranch, /\["round-trip", "one-way", "multi-city"\]/);
  assert.match(mobileBranch, /grid-cols-3/);
  assert.match(mobileBranch, /role="radio"[\s\S]*?aria-checked=\{selected\}/);
  assert.match(mobileBranch, /aria-disabled=\{unavailable\}/);
  assert.match(mobileBranch, /h-\[5px\] w-\[5px\] rounded-full bg-\[#004BB8\]/);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-trip-selector[^\n]*border/);
});

test("mobile English trip labels are exact and multi-city is truthfully unavailable", () => {
  assert.match(source, /"Round-trip"[\s\S]*?"One-way"[\s\S]*?"Multi-city"/);
  assert.match(source, /const unavailable = mode === "multi-city"/);
  assert.match(mobileBranch, /disabled=\{unavailable\}/);
  assert.match(mobileBranch, /Multi-city search coming soon/);
});

test("mobile homepage controls use one responsive product-tab renderer without scaling", () => {
  assert.equal((source.match(/const mobileHomepageProductTabs = \(/g) ?? []).length, 1);
  assert.equal((source.match(/data-testid="mobile-homepage-product-tabs"/g) ?? []).length, 1);
  assert.match(mobileProductTabs, /grid h-12 w-full/);
  assert.match(mobileProductTabs, /text-\[13px\] min-\[360px\]:text-\[14px\] min-\[375px\]:text-\[16px\]/);
  assert.match(mobileProductTabs, /h-\[18px\] w-\[18px\][^"\n]*min-\[360px\]:h-5[^"\n]*min-\[375px\]:h-\[22px\]/);
  assert.match(mobileProductTabs, /gap-\[3px\][^"\n]*min-\[360px\]:gap-1[^"\n]*min-\[375px\]:gap-\[5px\]/);
  assert.match(mobileBranch, /whitespace-nowrap/);
  assert.doesNotMatch(mobileBranch, /truncate[^\n]*\{label\}|text-ellipsis/);
  assert.match(mobileBranch, /h-\[68px\][^\n]*mobile-homepage|className="focus-ring flex h-\[68px\]/);
  assert.match(mobileBranch, /h-\[62px\][^\n]*w-full/);
  assert.match(mobileBranch, /h-16 w-full/);
  assert.match(mobileBranch, /h-12 w-full rounded-\[10px\]/);
  assert.match(mobileBranch, /mobile-homepage-trip-selector[\s\S]*?text-\[12px\][\s\S]*?max-\[359px\]:text-\[11px\][\s\S]*?h-4 w-4/);
  assert.doesNotMatch(mobileBranch, /transform:\s*scale|scale-\[/);
});

test("mobile homepage uses one top anchor and reserves the measured active-card height", () => {
  assert.match(homepage, /top-\[calc\(100%-4rem\)\][^\n]*sm:hidden/);
  assert.doesNotMatch(homepage, /bottom-\[-460px\]|pt-\[30\.5rem\]/);
  assert.match(homepage, /new ResizeObserver\(updateHeight\)/);
  assert.match(homepage, /observer\.observe\(card\)/);
  assert.match(homepage, /--mobile-search-card-height/);
  assert.match(homepage, /pt-\[max\(1\.75rem,calc\(var\(--mobile-search-card-height\)_-_2\.25rem\)\)\]/);
  assert.doesNotMatch(homepage, /tab === ["'](?:hotels|cars|flights|deals)["'][\s\S]{0,120}top-/);
  assert.match(homepage, /bottom-\[-52px\][^\n]*hidden sm:block lg:bottom-\[-56px\]/);
});

test("mobile Hotels removes only the nested surface and keeps its connected controls", () => {
  assert.match(source, /const hotelFieldCardClassName = mobileHomepage[\s\S]*?overflow-visible border-0 bg-transparent p-0 shadow-none ring-0/);
  assert.match(sharedBranch, /mobile-homepage-hotel-controls/);
  assert.match(sharedBranch, /mobile-homepage-hotel-destination[\s\S]*?HotelDestinationMobilePicker/);
  assert.match(sharedBranch, /mobile-homepage-hotel-dates[\s\S]*?HotelMobilePickerShell/);
  assert.match(sharedBranch, /mobile-homepage-hotel-guests[\s\S]*?hotelGuestsRoomsSummary/);
  assert.match(sharedBranch, /mobile-homepage-hotel-search/);
  assert.match(sharedBranch, /rounded-\[11px\] border-\[#dee5ed\] bg-\[#fcfdfe\]/);
  assert.match(source, /mobileHomepage[\s\S]{0,180}rounded-\[14px\][^\n]*p-\[13px\]/);
});

test("mobile homepage Hotels aligns neutral icons with values while preserving field behavior", () => {
  assert.match(hotelDestinationField, /hotelSearchDestinationLabel[\s\S]*?mobile-homepage-hotel-destination-value/);
  assert.match(hotelDestinationHomepageValue, /flex min-w-0 items-center gap-2/);
  assert.match(hotelDestinationHomepageValue, /<MapPin[\s\S]*?aria-hidden="true"[\s\S]*?h-4 w-4 shrink-0 text-slate-500/);
  assert.match(hotelDestinationHomepageValue, /<MapPin[\s\S]*?destination\.trim\(\) \|\| t\.cityOrHotel \|\| "City or hotel"/);
  assert.doesNotMatch(hotelDestinationHomepageValue, /ChevronDown/);
  assert.match(hotelDestinationField, /setHotelDestinationMobilePickerOpen\(true\)/);
  assert.match(hotelDestinationField, /<input[\s\S]*?className=\{cn\(hotelFieldValueClassName, "hidden sm:block"\)\}/);

  assert.match(sharedBranch, /mobile-homepage-hotel-dates[\s\S]*?<Calendar[\s\S]*?size=\{16\}[\s\S]*?text-slate-500/);
  assert.match(hotelGuestsField, /hotelSearchGuestsLabel[\s\S]*?mobile-homepage-hotel-guests-value/);
  assert.match(hotelGuestsField, /mobile-homepage-hotel-guests-value[\s\S]*?<UserRound[\s\S]*?aria-hidden="true"[\s\S]*?h-4 w-4 shrink-0 text-slate-500 sm:hidden/);
  assert.match(hotelGuestsField, /<UserRound[\s\S]*?\{hotelGuestsRoomsSummary\}[\s\S]*?<ChevronDown/);
  assert.match(mobileProductTabs, /\["flights", Plane,[\s\S]*?\["hotels", Building2,[\s\S]*?\["cars", CarFront,[\s\S]*?\["deals", PackagesIcon/);
});

test("mobile Cars removes its nested surface and uses controlled card geometry", () => {
  assert.match(source, /const carsFieldCardClassName = mobileHomepage[\s\S]*?overflow-visible border-0 bg-transparent p-0 shadow-none ring-0/);
  assert.match(source, /mobileHomepage[\s\S]{0,160}rounded-\[14px\]/);
  assert.match(source, /const carsMobileHomepageFieldClassName = mobileHomepage[\s\S]*?rounded-\[11px\] border-\[#dee5ed\] bg-\[#fcfdfe\]/);
  assert.match(sharedBranch, /className=\{carsFieldCardClassName\} data-testid="cars-joined-search-card"/);
  assert.doesNotMatch(sharedBranch, /className=\{fieldCardClassName\} data-testid="cars-joined-search-card"/);
});

test("mobile Cars places its single return-location field directly after pickup", () => {
  const carsBranch = source.slice(source.lastIndexOf("<form onSubmit={onCarsSubmit}"));
  const order = [
    "cars-pickup-location-field",
    "{mobileHomepage ? carsReturnLocationField : null}",
    'id="homepage-cars-rental-dates"',
    'id="homepage-cars-time-range"',
    'id="homepage-cars-driver-age"',
    'aria-label={translate("searchCars")',
    "Different return location",
  ];
  let previous = -1;
  for (const marker of order) {
    const index = carsBranch.indexOf(marker);
    assert.ok(index > previous, `${marker} should follow the preceding Cars control`);
    previous = index;
  }
  assert.equal((source.match(/data-testid="cars-return-location-field"/g) ?? []).length, 1);
  assert.match(source, /const carsReturnLocationField = carsValues\.returnToDifferentLocation/);
  assert.match(carsBranch, /checked=\{carsValues\.returnToDifferentLocation\}[\s\S]*?updateCarsValue\("returnToDifferentLocation", event\.target\.checked\)/);
});

test("mobile flight field icons sit in value rows without decorative tiles", () => {
  assert.match(mobileBranch, /mobile-homepage-\$\{kind\}-field/);
  assert.equal((mobileBranch.match(/<MapPin aria-hidden="true"/g) ?? []).length, 1);
  assert.match(mobileBranch, /mobile-homepage-\$\{kind\}-value[\s\S]*?<MapPin aria-hidden="true"[^>]*h-4 w-4[^>]*text-slate-500/);
  assert.match(mobileBranch, /mobile-homepage-travel-dates-value[\s\S]*?<Calendar aria-hidden="true"[^>]*h-4 w-4[^>]*text-slate-500/);
  assert.match(mobileBranch, /mobile-homepage-travelers-value[\s\S]*?<UserRound aria-hidden="true"[^>]*h-4 w-4[^>]*text-slate-500/);
  assert.doesNotMatch(mobileBranch, /mobile-homepage-location-icon-tile|rounded-full[^\n]*<(?:MapPin|Calendar|UserRound)|bg-\[#eef5ff\][^\n]*<(?:MapPin|Calendar|UserRound)/);
  assert.match(mobileBranch, /tracking-\[0\.11em\][^\n]*\{label\}<\/span>[\s\S]*?mobile-homepage-\$\{kind\}-value/);
  assert.match(mobileBranch, /tracking-\[0\.11em\][^\n]*\{mobileTravelDatesLabel\}<\/span>[\s\S]*?mobile-homepage-travel-dates-value/);
  assert.match(mobileBranch, /tracking-\[0\.11em\][^\n]*\{mobileTravelersCabinLabel\}<\/span>[\s\S]*?mobile-homepage-travelers-value/);
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

test("mobile Flights alone uses straighter card and control geometry", () => {
  assert.match(mobileBranch, /mobile-homepage-flight-search[\s\S]{0,120}rounded-\[14px\]/);
  assert.ok((mobileBranch.match(/rounded-\[10px\] border border-\[#dee5ed\] bg-\[#fcfdfe\]/g) ?? []).length >= 3);
  assert.match(mobileBranch, /mobile-homepage-search-submit[\s\S]{0,180}rounded-\[10px\]/);
});

test("flight CTA preserves validation without whole-button opacity washout", () => {
  assert.match(source, /const isFlightSearchDisabled =[\s\S]*?!from\.trim\(\)[\s\S]*?!to\.trim\(\)[\s\S]*?!isValidFlightDate\(departureDate\)[\s\S]*?!isFlightReturnRangeValid/);
  assert.match(mobileBranch, /disabled=\{isFlightSearchDisabled\}/);
  assert.match(mobileBranch, /bg-\[#004BB8\]/);
  assert.match(mobileBranch, /disabled:bg-\[#004BB8\]/);
  assert.match(mobileBranch, /disabled:opacity-100/);
  assert.doesNotMatch(mobileBranch, /disabled:bg-\[#336fbd\]|disabled:opacity-(?:50|60)/);
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

test("all mobile homepage products remain switchable without route navigation", () => {
  assert.match(mobileProductTabs, /setTab\(mode\)/);
  assert.match(mobileProductTabs, /"flights"[\s\S]*"hotels"[\s\S]*"cars"[\s\S]*"deals"/);
  assert.match(sharedBranch, /\) : tab === "hotels" \? \(/);
  assert.match(sharedBranch, /\) : \([\s\S]*?onSubmit=\{onCarsSubmit\}/);
  assert.match(mobileProductTabs, /\["flights", Plane/);
  assert.match(mobileProductTabs, /\["hotels", Building2/);
  assert.match(mobileProductTabs, /\["cars", CarFront/);
  assert.match(mobileProductTabs, /\["deals", PackagesIcon, t\.deals \|\| "Packages"\]/);
  assert.match(mobileProductTabs, /aria-selected=\{selected\}/);
  assert.match(mobileProductTabs, /selected && "bg-\[#eef5ff\] text-\[#075ee8\]"/);
  assert.doesNotMatch(sharedBranch, /router\.push\("\/packages"\)/);
  assert.doesNotMatch(sharedBranch, /startRouteProgress\(\);[\s\S]{0,80}setTab\("deals"\)/);
});

test("mobile Deals outer surface uses the refined radius without changing shared desktop geometry", () => {
  assert.match(source, /mobile-homepage-deals-surface[^\n]*rounded-\[14px\]/);
  assert.doesNotMatch(source, /mobile-homepage-deals-surface[^\n]*rounded-\[19px\]/);
});
