import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("src/components/search/DealsSearchForm.tsx", "utf8");
const page = readFileSync("src/app/deals/page.tsx", "utf8");
const compactStart = form.indexOf("const compactMobileControls");
const compactEnd = form.indexOf("\n  return (", compactStart);
const compact = form.slice(compactStart, compactEnd);

test("Packages route selects a dedicated landing presentation while Deals keeps desktop landing", () => {
  assert.match(page, /usePathname/);
  assert.match(
    page,
    /pathname === "\/packages" \? "packages-landing" : "desktop-landing"/,
  );
  assert.match(form, /\| "packages-landing"/);
  assert.match(
    form,
    /presentation === "desktop-landing" \|\| isPackagesLanding/,
  );
  assert.match(form, /isPackagesLanding \? "hidden sm:contents" : "contents"/);
});

test("standalone mobile Packages has the approved identity without homepage product tabs", () => {
  assert.match(compact, /data-packages-identity-icon/);
  assert.match(compact, /<PackagesIcon/);
  assert.match(compact, /text-\[22px\][\s\S]*\{t\("deals"\)\}/);
  assert.match(compact, /h-px bg-\[#dee5ed\]/);
  assert.doesNotMatch(compact, /Flights \| Hotels \| Cars \| Packages/);
});

test("standalone package mode rail keeps four canonical icon-labelled choices", () => {
  for (const [mode, label] of [
    ["hotel-flight", "Flight + Hotel"],
    ["flight-car", "Flight + Car"],
    ["hotel-car", "Hotel + Car"],
    ["hotel-flight-car", "Flight + Hotel + Car"],
  ]) {
    assert.match(
      form,
      new RegExp(`mode: "${mode}", text: "${label.replaceAll("+", "\\+")}"`),
    );
  }
  for (const utility of [
    "overflow-x-auto",
    "overflow-y-hidden",
    "overscroll-x-contain",
    "touch-pan-x",
    "[&::-webkit-scrollbar]:hidden",
  ]) {
    assert.ok(compact.includes(utility));
  }
  assert.match(
    compact,
    /isPackagesLanding \? \([\s\S]*?Building2[\s\S]*?Plane[\s\S]*?CarFront/,
  );
  assert.match(compact, /after:h-\[2px\][\s\S]*after:bg-\[#075ee8\]/);
  assert.doesNotMatch(compact, /rounded-full border-2 px-4/);
});

test("trip radios expose only supported canonical values and disable Multi-city", () => {
  assert.match(compact, /\["round-trip", "one-way"\] as const/);
  assert.match(compact, /setDealsFlightTripType\(value\)/);
  assert.match(
    compact,
    /role="radio"[\s\S]*aria-disabled="true"[\s\S]*disabled[\s\S]*t\("multiCity"\)/,
  );
  assert.doesNotMatch(compact, /setDealsFlightTripType\("multi-city"\)/);
});

test("mobile Packages fields use label then left icon and value with one canonical swap", () => {
  const helper = form.slice(
    form.indexOf("const compactPackageFieldContent"),
    compactStart,
  );
  assert.ok(helper.indexOf("{label}") < helper.indexOf("{icon}"));
  assert.ok(helper.indexOf("{icon}") < helper.indexOf("{value}"));
  assert.match(form, /h-\[62px\] rounded-\[10px\]/);
  assert.match(compact, /t\("origin"\)[\s\S]*?<MapPin/);
  assert.match(compact, /t\("destination"\)[\s\S]*?<MapPin/);
  assert.match(compact, /t\("travelDates"\)[\s\S]*?<Calendar/);
  assert.match(compact, /deals\.travelersRoomsLabel[\s\S]*?<UserRound/);
  assert.equal((compact.match(/<ArrowRightLeft/g) ?? []).length, 1);
  assert.match(compact, /onClick=\{swapDealsFlightAirports\}/);
});

test("standalone mobile CTA and card geometry are scoped without changing homepage", () => {
  assert.match(form, /rounded-\[16px\][\s\S]*sm:rounded-3xl/);
  assert.match(compact, /isPackagesLanding \? "h-\[50px\] rounded-\[10px\]" : "h-12 rounded-\[11px\]"/);
  assert.match(compact, /\{t\("deals.searchButton"\)\}/);
  assert.match(form, /presentation === "mobile-homepage"\s*\? "w-full"/);
  assert.match(
    form,
    /presentation === "mobile-homepage" \? compactMobileControls/,
  );
});

test("mobile Packages uses moderate field, rail, trip row, and CTA sizing", () => {
  assert.match(form, /h-\[62px\] rounded-\[10px\] px-4 py-2\.5/);
  assert.match(form, /text-\[16px\] leading-5/);
  assert.match(compact, /h-\[46px\] gap-1\.5 px-2 text-\[13px\]/);
  assert.match(compact, /className="flex min-h-11 items-center justify-between/);
  assert.match(compact, /h-\[50px\]/);
  assert.doesNotMatch(compact, /h-\[78px\]|text-\[18px\]|h-\[54px\]/);
});

test("mobile hero is bounded and card clearance is measured independently", () => {
  assert.match(page, /className="relative h-96 overflow-visible/);
  assert.match(page, /bottom-\[calc\(-1_\*_var\(--deals-search-outside\)\)\]/);
  assert.match(page, /Math\.max\(0, height - insideHeight\)/);
  assert.match(page, /pt-\[calc\(var\(--deals-search-outside\)\+3rem\)\]/);
  assert.doesNotMatch(page, /sm:h-\[calc\(2\.5rem\+var\(--deals-search-inside\)\)\]/);
});
