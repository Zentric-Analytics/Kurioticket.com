import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const sheet = readFileSync("src/components/results/MobileFlightFiltersSheet.tsx", "utf8");

test("mobile full Filters uses the native section hierarchy", () => {
  const order = ["Price", "Flight times", "Duration", "Stops", "Airlines", "Airports", "Fare preferences"].map((title) => sheet.indexOf(`title=\"${title}\"`));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])));
  assert.doesNotMatch(sheet, /title="Flight Quality"|title="Amenities"/);
  assert.match(client, /<MobileFlightFiltersSheet/);
  assert.match(client, /role="dialog" aria-modal="true" aria-labelledby="flight-mobile-filters-title"/);
});

test("journey-aware Flight times provide leg tabs and scoped Takeoff and Landing controls", () => {
  assert.match(sheet, /role="tablist" aria-label="Flight leg"/);
  assert.match(sheet, /Departing flight/);
  assert.match(sheet, /Return flight/);
  assert.match(sheet, /`Flight \$\{\(item\.legIndex \?\? index\) \+ 1\}`/);
  assert.match(sheet, /Takeoff: \$\{leg\.originAirport\}/);
  assert.match(sheet, /Landing: \$\{leg\.destinationAirport\}/);
  assert.match(client, /matchesMobileJourneyTimes/);
});

test("Flight full Filters keeps Flight-specific controls inside the Cars visual system", () => {
  for (const copy of ["Maximum price", "Up to ", "Maximum travel time", "Nonstop", "1 stop", "2+ stops", "Search airlines", "Show more", "Show less", "FROM", "TO", "Baggage included", "Flexible / refundable"]) assert.match(sheet, new RegExp(copy.replace(/[+]/g, "\\+")));
  assert.match(sheet, /grid gap-6 bg-transparent/);
  assert.match(sheet, /text-\[15px\] font-extrabold text-slate-950/);
  assert.match(sheet, /min-h-\[46px\]/);
  assert.match(sheet, /border-\[#D8DEE8\] bg-transparent/);
  assert.match(sheet, /text-xs leading-4 tabular-nums text-slate-500/);

  const full = client.slice(
    client.indexOf("function renderMobileFullFiltersSheet()"),
    client.indexOf("function renderDesktopSortControl()"),
  );
  assert.match(full, /min-h-\[76px\][^"]*bg-\[#F2F4F8\]/);
  assert.match(full, /px-6 pb-8 pt-4/);
  assert.match(full, /gap-3\.5 border-t border-\[#D8DEE8\]/);
  assert.match(full, /h-\[49px\] min-w-\[116px\]/);
  assert.match(full, /min-h-\[50px\][^"]*bg-\[#004BB8\][^"]*text-base font-bold leading-\[22px\]/);
  assert.match(full, /disabled=\{sortedResults\.length === 0\}/);
  assert.match(full, /`View \$\{sortedResults\.length\}/);
});

test("mobile endpoint airports exclude layovers while desktop options remain unchanged", () => {
  assert.match(client, /mobileFromAirportOptions[\s\S]*legs\?\.\[0\]\?\.originAirport/);
  assert.match(client, /mobileToAirportOptions[\s\S]*legs\?\.at\(-1\)\?\.destinationAirport/);
  assert.match(client, /const airportOptions = useMemo[\s\S]*flight\.layovers/);
  assert.match(client, /<DesktopFlightFilters/);
});

test("mobile results count uses native English capitalization and omits the range", () => {
  assert.match(client, /`\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  const intro = client.slice(client.indexOf("data-flight-mobile-results-intro"), client.indexOf("data-flight-mobile-results-intro") + 700);
  assert.doesNotMatch(intro, /resultsDisplayRange|&ndash;/);
  assert.match(intro, /text-\[13px\][^\n]*font-bold[^\n]*leading-\[17px\]/);
  assert.match(client, /className="hidden w-full items-center[^\n]*sm:flex/);
});
