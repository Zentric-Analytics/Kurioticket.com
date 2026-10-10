import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const client = readFileSync("src/components/results/FlightResultsClient.tsx", "utf8");
const sheet = readFileSync("src/components/results/MobileFlightFiltersSheet.tsx", "utf8");
const quick = client.slice(
  client.indexOf("function renderMobileSortResultsRow"),
  client.indexOf("function renderFloatingFilterButton"),
);

test("mobile full Filters uses the native section hierarchy", () => {
  const order = ["Price", "Flight times", "Duration", "Stops", "Airlines", "Airports", "Fare preferences"].map((title) => sheet.indexOf(`title=\"${title}\"`));
  assert.ok(order.every((position, index) => position >= 0 && (index === 0 || position > order[index - 1])));
  assert.doesNotMatch(sheet, /title="Flight Quality"|title="Amenities"/);
  assert.match(client, /<MobileFlightFiltersSheet/);
  assert.match(client, /role="dialog"[\s\S]*aria-modal="true"[\s\S]*aria-labelledby="flight-mobile-filters-title"/);
});

test("journey-aware Flight times provide leg tabs and scoped Takeoff and Landing controls", () => {
  assert.match(sheet, /role="tablist"[\s\S]*aria-label="Flight leg"/);
  assert.match(sheet, /Departing flight/);
  assert.match(sheet, /Return flight/);
  assert.match(sheet, /`Flight \$\{\(item\.legIndex \?\? index\) \+ 1\}`/);
  assert.match(sheet, /Takeoff: \$\{leg\.originAirport\}/);
  assert.match(sheet, /Landing: \$\{leg\.destinationAirport\}/);
  assert.match(client, /flightMatchesFilters\(flight, authoritativeFilterState/);
});

test("Flight full Filters keeps Flight-specific controls inside the Cars visual system", () => {
  for (const copy of ["Maximum price", "Up to ", "Maximum travel time", "Nonstop", "1 stop", "2+ stops", "Search airlines", "Show more", "Show less", "FROM", "TO", "Baggage included", "Flexible / refundable"]) assert.match(sheet, new RegExp(copy.replace(/[+]/g, "\\+")));
  assert.match(sheet, /grid gap-6 bg-transparent/);
  assert.match(sheet, /text-lg font-semibold leading-6 text-slate-950/);
  assert.match(sheet, /min-h-11/);
  assert.match(sheet, /rounded-lg bg-transparent/);
  assert.match(sheet, /text-xs font-medium tabular-nums text-slate-500/);

  const full = client.slice(
    client.indexOf("function renderMobileFullFiltersSheet()"),
    client.indexOf("function renderDesktopSortControl()"),
  );
  assert.match(full, /h-16 shrink-0[^"]*bg-\[#F2F4F8\]/);
  assert.match(full, /items-center gap-3 border-t border-\[#D8DEE8\]/);
  assert.match(full, /h-11 w-\[30%\] shrink-0/);
  assert.match(full, /h-11 min-w-0 flex-1 rounded-lg bg-\[#004BB8\]/);
  assert.match(full, /disabled=\{sortedResults\.length === 0\}/);
  assert.match(full, /`View \$\{sortedResults\.length\}/);
});

test("paired mobile filter actions keep compact reset and apply targets", () => {
  const full = client.slice(
    client.indexOf("function renderMobileFullFiltersSheet()"),
    client.indexOf("function renderDesktopSortControl()"),
  );
  assert.match(quick, /data-flight-quick-sheet-footer[\s\S]*items-center justify-between gap-3/);
  assert.match(quick, /h-11 w-\[32%\] shrink-0 rounded-lg/);
  assert.doesNotMatch(quick, /mobileShortcutSheet === "sort" && "flex-1"/);
  assert.doesNotMatch(quick, /className="[^"]*\bflex-1\b[^"]*rounded-xl bg-\[#004BB8\]/);
  assert.match(quick, /onClick=\{applySheet\}/);
  assert.match(quick, /disabled=\{mobileShortcutSheet !== "sort" && draftMatches === 0\}/);
  assert.match(full, /data-flight-full-filters-footer[\s\S]*items-center gap-3/);
  assert.match(full, /w-\[30%\] shrink-0/);
  assert.match(full, /h-11 min-w-0 flex-1 rounded-lg/);
  assert.match(full, /activeFilterCount > 0 \? \(/);
  assert.match(full, /sortedResults\.length === 1 \? "flight" : "flights"/);
  assert.match(full, /disabled=\{sortedResults\.length === 0\}/);
});

test("all mobile quick sheets share compact edge-aligned footer actions", () => {
  for (const kind of ["airlines", "stops", "airports"]) {
    assert.match(quick, new RegExp(`mobileShortcutSheet === "${kind}"`));
  }
  assert.match(quick, /onClick=\{resetSheet\}/);
  assert.match(quick, /onClick=\{applySheet\}[\s\S]*>\s*Apply\s*<\/button>/);
  assert.match(quick, /disabled=\{mobileShortcutSheet !== "sort" && draftMatches === 0\}/);
});

test("mobile Quick Filters rail portals into the persistent header and stays viewport-contained", () => {
  assert.match(client, /data-flight-results-main className="max-sm:overflow-x-clip/);
  assert.match(client, /const mobileResultsFiltersContent = \([\s\S]{0,500}data-flight-mobile-results-shortcuts/);
  assert.match(client, /mobileNavFiltersTarget[\s\S]*createPortal\(mobileResultsFiltersContent, mobileNavFiltersTarget\)/);
  assert.match(client, /data-mobile-flight-shortcuts[\s\S]{0,220}scrollbar-hide flex w-full min-w-0[^"]*px-3/);
  assert.doesNotMatch(client, /data-flight-mobile-filter-slot|flight-mobile-scroll-filter-bar|-mx-\[14px\]/);
});

test("mobile endpoint airports use authoritative directional endpoints while desktop options remain unchanged", () => {
  assert.match(client, /mobileFromAirportOptions[\s\S]*flightAirportEndpoints\(flight\)\.fromAirports/);
  assert.match(client, /mobileToAirportOptions[\s\S]*flightAirportEndpoints\(flight\)\.toAirports/);
  assert.match(client, /const airportOptions = useMemo[\s\S]*flight\.layovers/);
  assert.match(client, /<DesktopFlightFilters/);
});

test("desktop airport state remains authoritative and memo dependencies track selection values", () => {
  assert.match(client, /airports: selectedAirports/);
  assert.match(client, /selectedAirlines,[\s\S]*selectedAirports,[\s\S]*selectedFromAirports,[\s\S]*selectedToAirports,[\s\S]*selectedFlightQuality,[\s\S]*selectedStops/);
  assert.doesNotMatch(client, /selectedAirlines\.length[\s\S]*selectedFlightQuality\.length[\s\S]*selectedStops\.length/);
});

test("multi-city Edit Search uses the projected first-leg departure date", () => {
  assert.match(client, /const projection = projectSearchLegs\(value\.tripType, value\.legs\)/);
  assert.match(client, /departureDate: projection\.departureDate/);
  assert.doesNotMatch(client, /departureDate: value\.departureDate/);
});

test("mobile results count uses native English capitalization and identifies the visible page range", () => {
  assert.match(client, /`\$\{count\} \$\{count === 1 \? "Result" : "Results"\} found`/);
  const intro = client.slice(client.indexOf("data-flight-mobile-results-intro"), client.indexOf("data-flight-mobile-results-intro") + 700);
  assert.match(intro, /resultsDisplayRange/);
  assert.match(client, /Showing results \$\{resultsDisplayRange.start\} through \$\{resultsDisplayRange.end\} of \$\{sortedResults.length\}/);
  assert.match(intro, /text-\[13px\][^\n]*font-bold[^\n]*leading-\[17px\]/);
  assert.match(client, /className="hidden w-full items-center[^\n]*sm:flex/);
});


test("Flight mobile range scales match the polished reference geometry", () => {
  assert.match(sheet, /\[&::-webkit-slider-runnable-track\]:h-2/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:h-4/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:w-4/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:border-2/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:border-white/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:bg-\[#2F73C8\]/);
  assert.match(sheet, /\[&::-webkit-slider-thumb\]:shadow-md/);
  assert.match(sheet, /#D8DEE8_var\(--flight-range-progress\)_100%/);
  assert.match(sheet, /"--flight-range-progress": `\$\{progress\}%`/);
  assert.match(sheet, /style=\{rangeProgressStyle\([\s\S]*priceBounds\.min[\s\S]*priceBounds\.max/);
  assert.match(sheet, /style=\{rangeProgressStyle\([\s\S]*legTimes\.min[\s\S]*legTimes\.max/);
  assert.match(sheet, /style=\{rangeProgressStyle\([\s\S]*durationBounds\.min[\s\S]*durationBounds\.max/);
});
