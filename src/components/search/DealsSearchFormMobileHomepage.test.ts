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
  assert.match(compact, /px-2\.5 text-\[12px\] font-medium/);
  assert.doesNotMatch(compact, /text-\[13px\]|px-3 text-\[13px\]/);
  assert.match(compact, /<span className="whitespace-nowrap">\{text\}<\/span>/);
  assert.doesNotMatch(compact.slice(0, compact.indexOf("Origin")), /truncate|text-overflow|ellipsis/);
  assert.match(form, /presentation === "mobile-homepage"/);
  assert.match(form, /\{mobileHomepageControls \?\? \(/);
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
  assert.match(compact, /role="radio"[\s\S]*?aria-checked=\{selected\}[\s\S]*?aria-label=\{text\}/);
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

test("mobile Packages fields use restrained geometry and neutral value-row icons", () => {
  assert.match(form, /compactFieldClassName[\s\S]{0,180}rounded-\[10px\]/);
  assert.match(form, /compactFieldClassName[\s\S]{0,220}h-\[68px\][^\"]*items-center justify-between[^\"]*px-\[13px\] py-\[11px\]/);
  assert.match(form, /compactValueRowClassName[\s\S]{0,100}mt-1\.5 flex min-w-0 items-center gap-2 text-slate-600/);
  assert.match(form, /compactValueIconClassName = "h-4 w-4 shrink-0"/);
  assert.doesNotMatch(form, /compactIconClassName|h-8 w-8[^\"]*rounded-full[^\"]*bg-slate-100\/70/);
  assert.match(compact, /type="submit"[\s\S]{0,180}rounded-\[11px\]/);
  assert.doesNotMatch(compact, /LocateFixed/);
});

test("field content orders the label before the icon and value", () => {
  const helperStart = form.indexOf("const compactPackageFieldContent");
  const helperEnd = form.indexOf("const mobileHomepageControls", helperStart);
  const helper = form.slice(helperStart, helperEnd);
  const labelIndex = helper.indexOf("{label}");
  const rowIndex = helper.indexOf("compactValueRowClassName");
  const iconIndex = helper.indexOf("{icon}");
  const valueIndex = helper.indexOf("{value}");

  assert.ok(labelIndex >= 0 && labelIndex < rowIndex);
  assert.ok(rowIndex < iconIndex && iconIndex < valueIndex);
  assert.match(form, /compactValueTextClassName =\n\s+"min-w-0 truncate/);
});

test("all package modes share the label, value-row, icon hierarchy", () => {
  assert.equal((compact.match(/compactPackageFieldContent\(/g) ?? []).length, 6);
  assert.equal((compact.match(/<MapPin\s+aria-hidden="true"/g) ?? []).length, 3);
  assert.equal((compact.match(/<Calendar\s+aria-hidden="true"/g) ?? []).length, 2);
  assert.equal((compact.match(/<UserRound\s+aria-hidden="true"/g) ?? []).length, 1);
  assert.match(compact, /"Origin",[\s\S]{0,140}<MapPin/);
  assert.match(compact, /"Destination",[\s\S]{0,140}<MapPin/);
  assert.match(compact, /"Travel Dates",[\s\S]{0,140}<Calendar/);
  assert.match(compact, /Travelers &amp; Rooms[\s\S]{0,160}<UserRound/);
  for (const mode of ["hotel-flight", "flight-car", "hotel-car", "hotel-flight-car"]) {
    assert.ok(options.includes(`{ mode: "${mode}"`), `${mode} should use the shared controls`);
  }
  assert.match(compact, /included\.flight \?/);
  assert.match(compact, /included\.hotel \? <>Travelers &amp; Rooms<\/> : <>Travelers<\/>/);
});

test("flight packages expose one canonical route swap while hotel-car does not", () => {
  const branchStart = compact.indexOf("{included.flight ?");
  const hotelBranchStart = compact.indexOf("</div> : <>", branchStart);
  const flightBranch = compact.slice(branchStart, hotelBranchStart);
  assert.equal((flightBranch.match(/<ArrowRightLeft/g) ?? []).length, 1);
  assert.match(flightBranch, /onClick=\{swapDealsFlightAirports\}/);
  assert.match(flightBranch, /h-\[38px\] w-\[38px\]/);
  assert.doesNotMatch(compact.slice(hotelBranchStart), /ArrowRightLeft/);
});
