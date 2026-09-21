import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(new URL("./FlightResultsClient.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("./MobileFlightCard.tsx", import.meta.url), "utf8");

test("final mobile Flight Results order and controls remain intact", () => {
  const summary = results.indexOf("mobileResultsSearch={renderMobileRouteSummaryCard()}");
  const nearby = results.indexOf('data-nearby-fare-presentation="mobile"');
  const shortcuts = results.indexOf("data-flight-mobile-results-shortcuts");
  const alert = results.indexOf("<FlightPriceAlertControl");
  const count = results.indexOf("formatMobileFlightResultsFound");
  const cards = results.indexOf("data-mobile-continuous-flight-list");

  assert.ok(summary >= 0 && summary < nearby);
  assert.doesNotMatch(results, /aria-label="Go back"|renderMobileCompactResultsHeader/);
  assert.match(results, /aria-label=\{t\("editFlightSearch"\)\}/);
  assert.ok(nearby >= 0 && nearby < shortcuts && shortcuts < alert && alert < count && count < cards);
  assert.match(results, /<span>Filters<\/span>/);
  for (const trigger of ['renderTrigger("sort", activeSortOption.label)', 'renderTrigger("airlines", "Airlines")', 'renderTrigger("stops", "Stops")', 'renderTrigger("airports", "Airports")']) assert.ok(results.includes(trigger));
});

test("mobile list omits web-only page extras while desktop keeps them", () => {
  assert.match(results, /data-mobile-continuous-flight-list/);
  assert.match(results, /sortedResults\.map\(\(flight, index\)/);
  assert.doesNotMatch(results, /aria-label="Back to top"/);
  assert.match(results, /className=\{cn\("hidden sm:block"[\s\S]*<FlightResultsPagination/);
  assert.match(results, /<div className="hidden sm:block"><Footer variant="brand-legal-only" \/><\/div>/);
});

test("mobile and desktop commercial actions stay isolated", () => {
  const desktopCard = readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8");
  assert.match(card, /View deals/);
  assert.match(card, /ChevronRight/);
  assert.doesNotMatch(card, /View Flight|viewFlight/);
  assert.match(desktopCard, /viewFlightLabel/);
  assert.match(desktopCard, /relative hidden w-full[\s\S]*sm:block/);
});
