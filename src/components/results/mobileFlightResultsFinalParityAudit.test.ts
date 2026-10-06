import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");

test("final mobile Flight Results order and controls remain intact", () => {
  const summary = results.indexOf("mobileResultsSearch={renderMobileRouteSummaryCard()}");
  const shortcuts = results.indexOf("data-flight-mobile-results-shortcuts");
  const nearby = results.indexOf('data-nearby-fare-presentation="mobile"');
  const alert = results.indexOf("data-flight-price-alert-row", nearby);
  const count = results.indexOf("data-mobile-flight-results-summary-row", alert);
  const cards = results.indexOf("data-mobile-paginated-flight-results", count);
  assert.ok(summary >= 0 && summary < shortcuts && shortcuts < nearby && nearby < alert && alert < count && count < cards);
  assert.doesNotMatch(results, /renderMobileCompactResultsHeader/);
  assert.match(results, /mobileResultsTrailingActions/);
  assert.match(results, /aria-label=\{`\$\{t\("editFlightSearch"\)\}/);
  for (const trigger of ['renderTrigger("sort", activeSortOption.label)', 'renderTrigger("airlines", "Airlines", selectedAirlines.length)', 'renderTrigger("stops", "Stops", selectedStops.length)', 'renderTrigger("airports", "Airports", selectedFromAirports.length + selectedToAirports.length)']) assert.ok(results.includes(trigger));
});

test("mobile list uses the shared twenty-result pagination and keeps website footer controls", () => {
  assert.match(results, /data-mobile-paginated-flight-results/);
  assert.match(results, /visibleResults\.map\(\(flight, index\)/);
  assert.match(results, /data-mobile-flight-results-summary-row/);
  assert.match(results, /resultsDisplayRange\.start/);
  assert.match(results, /resultsDisplayRange\.end/);
  assert.match(results, /<FlightResultsPagination[\s\S]*disabled=\{paginationPendingPage !== null\}/);
  assert.match(results, /aria-label="Back to top"/);
  assert.match(results, /<Footer variant="brand-legal-only" \/>/);
  assert.doesNotMatch(results, /data-mobile-continuous-flight-list|sortedResults\.map\(\(flight, index\)/);
});

test("mobile and desktop commercial actions stay isolated", () => {
  const desktopCard = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  assert.match(card, /View deals/);
  assert.match(card, /ChevronRight/);
  assert.doesNotMatch(card, /View Flight|viewFlight/);
  assert.match(desktopCard, /viewFlightLabel/);
  assert.match(desktopCard, /relative hidden w-full[\s\S]*sm:block/);
});
