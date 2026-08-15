import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const compactStart = form.indexOf("const mobileHomepagePackageOptions");
const compactEnd = form.indexOf("const dealsPackageOptions", compactStart);
const options = form.slice(compactStart, compactEnd);
const controlsStart = form.indexOf("const mobileHomepageControls");
const controlsEnd = form.indexOf("\n  return (", controlsStart);
const compact = form.slice(controlsStart, controlsEnd);
const searchTabs = readFileSync("src/components/search/SearchTabs.tsx", "utf8");

test("mobile homepage exposes exactly four canonical package modes in visible order", () => {
  assert.match(form, /presentation\?: "default" \| "mobile-homepage"/);
  const expected = [
    ['hotel-flight', 'Flight + Hotel'],
    ['flight-car', 'Flight + Car'],
    ['hotel-car', 'Hotel + Car'],
    ['hotel-flight-car', 'Flight + Hotel + Car'],
  ];
  let previous = -1;
  for (const [mode, label] of expected) {
    const declaration = `{ mode: "${mode}", text: "${label}" }`;
    const index = options.indexOf(declaration);
    assert.ok(index > previous, `${label} should map to ${mode} in order`);
    previous = index;
  }
  assert.equal((options.match(/\{ mode:/g) ?? []).length, 4);
  assert.match(compact, /mobileHomepagePackageOptions\.map/);
  assert.match(compact, /data-deals-mode=\{mode\}/);
  assert.match(compact, /selectPackageMode\(mode\)/);
  assert.match(form, /transitionDealsMode\(current, mode\)/);
});

test("mobile package selector is a compact, nowrap horizontal rail", () => {
  assert.match(compact, /mobile-homepage-deals-package-rail/);
  for (const utility of ["min-w-0", "w-full", "max-w-full", "flex-nowrap", "overflow-x-auto", "overflow-y-hidden", "overscroll-x-contain", "touch-pan-x", "[-webkit-overflow-scrolling:touch]", "[&::-webkit-scrollbar]:hidden"]) {
    assert.ok(compact.includes(utility), `rail should include ${utility}`);
  }
  assert.match(compact, /fieldset className="min-w-0 w-full max-w-full overflow-hidden"/);
  assert.match(compact, /h-10 w-max shrink-0/);
  assert.match(compact, /text-\[13px\]/);
  assert.match(compact, /<span className="whitespace-nowrap">\{text\}<\/span>/);
  assert.doesNotMatch(compact.slice(0, compact.indexOf("Origin")), /truncate|text-overflow|ellipsis/);
  assert.match(form, /presentation === "mobile-homepage"/);
  assert.match(form, /mobileHomepageControls \?\? <>/);
  assert.match(form, /data-deals-package-selector-variant=\{variant\}/);
});

test("selection stays visible and keyboard navigation reaches every package", () => {
  assert.match(form, /mobilePackageRailRef/);
  assert.match(form, /rail\.scrollBy\(\{/);
  assert.doesNotMatch(form.slice(form.indexOf("mobilePackageRailRef"), form.indexOf("const openFlightAirport")), /scrollIntoView/);
  assert.match(compact, /ArrowRight/);
  assert.match(compact, /ArrowLeft/);
  assert.match(compact, /event\.key === "Home"/);
  assert.match(compact, /event\.key === "End"/);
  assert.match(compact, /role="radiogroup"/);
  assert.match(compact, /role="radio" aria-checked=\{selected\} aria-label=\{text\}/);
});

test("mobile packages are text-only and selected state is an underline", () => {
  assert.doesNotMatch(compact.slice(0, compact.indexOf("Origin")), /<Plane|<Building2|<CarFront/);
  assert.match(compact, /text-slate-900/);
  assert.match(compact, /after:h-\[2px\]/);
  assert.match(compact, /after:bg-\[#075ee8\]/);
  assert.doesNotMatch(compact.slice(0, compact.indexOf("Origin")), /text-\[#075ee8\]|bg-\[#f2f7ff\]|bg-\[#eef5ff\]|border-\[#075ee8\]/);
});

test("compact controls reuse canonical pickers, summary, validation and submission", () => {
  assert.match(compact, /openFlightDates/);
  assert.match(compact, /openTravelers/);
  assert.match(compact, /travelerSummary/);
  assert.match(form, /validateDealsSearch\(candidate\)/);
  assert.match(form, /buildDealsJourneyUrl\([\s\S]*?getFirstDealsJourneyStage/);
  assert.match(form, /removeDealsStagedJourneyPlan\(\)/);
});

test("mobile Deals uses restrained geometry without changing desktop geometry", () => {
  assert.match(searchTabs, /mobile-homepage-deals-surface" className="rounded-\[14px\]/);
  assert.match(form, /compactFieldClassName =\s*\n\s*"[^"]*rounded-\[10px\] border border-\[#dee5ed\] bg-\[#fcfdfe\]/);
  assert.match(compact, /type="submit"[\s\S]*rounded-\[11px\][\s\S]*>Search deals<\/button>/);
  assert.match(form, /lg:rounded-\[8px\] lg:border-\[#dee5ed\]/);
});

test("mobile Deals field icons are small, neutral, left aligned, and not duplicated", () => {
  assert.match(form, /compactIconClassName =\s*\n\s*"flex h-8 w-8[^"]*bg-slate-100\/70 text-slate-600"/);
  assert.match(form, /compactIconSizeClassName = "h-\[17px\] w-\[17px\]"/);
  assert.doesNotMatch(compact, /LocateFixed/);
  assert.doesNotMatch(compact, /h-10 w-10|bg-\[#eef5ff\] text-\[#075ee8\]/);
  const flightBranch = compact.slice(compact.indexOf("{included.flight ?"), compact.indexOf(": <>", compact.indexOf("{included.flight ?")));
  const hotelCarBranch = compact.slice(compact.indexOf(": <>", compact.indexOf("{included.flight ?")), compact.indexOf("</>}", compact.indexOf(": <>", compact.indexOf("{included.flight ?"))));
  assert.equal((flightBranch.match(/<MapPin/g) ?? []).length, 2);
  assert.equal((hotelCarBranch.match(/<MapPin/g) ?? []).length, 1);
  assert.match(compact, /<Calendar[\s\S]*compactIconSizeClassName[\s\S]*<ChevronDown/);
  assert.match(compact, /<UserRound[\s\S]*compactIconSizeClassName[\s\S]*<ChevronDown/);
});

test("flight packages render one accessible canonical route swap and hotel-car renders none", () => {
  const flightBranch = compact.slice(compact.indexOf("{included.flight ?"), compact.indexOf(": <>", compact.indexOf("{included.flight ?")));
  const hotelCarBranch = compact.slice(compact.indexOf(": <>", compact.indexOf("{included.flight ?")), compact.indexOf("</>}", compact.indexOf(": <>", compact.indexOf("{included.flight ?"))));
  assert.equal((flightBranch.match(/<ArrowRightLeft/g) ?? []).length, 1);
  assert.equal((flightBranch.match(/onClick=\{swapDealsFlightAirports\}/g) ?? []).length, 1);
  assert.match(flightBranch, /aria-label=\{t\("swapOriginDestination"\) \|\| "Swap origin and destination"\}/);
  assert.match(flightBranch, /h-\[38px\] w-\[38px\]/);
  assert.doesNotMatch(hotelCarBranch, /ArrowRightLeft|swapDealsFlightAirports/);
  assert.match(form, /const swapDealsFlightAirports[\s\S]*swapFlightAirports/);
});
