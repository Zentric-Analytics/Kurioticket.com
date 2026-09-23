import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");

test("final mobile Flight Results order and controls remain intact", () => {
  const summary = results.indexOf("{renderMobileRouteSummaryCard()}");
  const nearby = results.indexOf('data-nearby-fare-presentation="mobile"');
  const shortcuts = results.indexOf("data-flight-mobile-results-shortcuts");
  const alert = results.indexOf("<FlightPriceAlertControl");
  const count = results.indexOf("formatMobileFlightResultsFound");
  const cards = results.indexOf("data-mobile-paginated-flight-results");

  assert.ok(summary >= 0 && summary < nearby);
  assert.match(results, /aria-label="Go back"/);
  assert.match(results, /renderMobileCompactResultsHeader/);
  assert.match(results, /data-flight-results-compact-header/);
  assert.match(results, /aria-label=\{t\("editFlightSearch"\)\}/);
  assert.ok(nearby >= 0 && nearby < shortcuts && shortcuts < alert && alert < count && count < cards);
  assert.match(results, /<span>Filters<\/span>/);
  for (const trigger of ['renderTrigger("sort", activeSortOption.label)', 'renderTrigger("airlines", "Airlines")', 'renderTrigger("stops", "Stops")', 'renderTrigger("airports", "Airports")']) assert.ok(results.includes(trigger));
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
