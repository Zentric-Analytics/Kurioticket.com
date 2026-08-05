import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const shell = readFileSync("src/components/results/deals/DealsJourneyShell.tsx", "utf8");
const stage = readFileSync("src/components/results/deals/DealsCarResultsStage.tsx", "utf8");
const carsClient = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
const card = readFileSync("src/components/results/CarResultCard.tsx", "utf8");

test("guided Car results use the shared Cars results experience inside the journey shell", () => {
  assert.match(carsClient, /export function CarsResultsExperience/);
  assert.match(shell, /<DealsCarResultsStage search=\{search\}/);
  assert.match(stage, /<CarsResultsExperience/);
  assert.doesNotMatch(stage, /<main|<h1|action="\/cars\/results"|desktopStickySearchSection|mobileSearchOpen|Breadcrumb/);
  assert.match(stage, /POST/);
  assert.match(stage, /\/api\/cars\/search/);
    assert.match(stage, /buildDealsCarRequestIdentity/);
  assert.match(stage, /AbortController/);
  assert.doesNotMatch(stage, /replaceDealsCarSelection|writeDealsStagedJourneyPlan|writeDealsTripPlan|removeDealsStagedJourneyPlan|markDealsProviderOpened|api\/redirect|bookingUrl|searchPolicy\.action\.href|cars\/details/);
});

test("guided structure provides h2 region, h3 cards, filters, sorting, disabled invalid links, and pending details", () => {
  assert.match(carsClient, /aria-labelledby=\{resultHeadingId\}/);
  assert.match(carsClient, /headingLevel=\{embedded \? "h3" : "h2"\}/);
  assert.match(carsClient, /<CarFilters/);
  assert.match(carsClient, /sortCarResults\(filterCarResults/);
  assert.match(carsClient, /detailsHrefForCar\(car\)/);
  assert.match(card, /detailsHref: string \| null/);
  assert.match(card, /detailsHref \? <Link/);
  assert.match(card, /<button type="button" disabled/);
  assert.match(card, /min-h-11/);
  assert.match(shell, /data-deals-guided-car-details-pending/);
  assert.doesNotMatch(shell, /data-deals-guided-car-results-pending className/);
});

test("guided lifecycle source contract excludes filter and sort from request dependencies", () => {
  assert.match(stage, /useEffect\(\(\) => \{/);
  assert.match(stage, /\}, \[payloadJson, requestIdentity, retryGeneration\]\)/);
  assert.doesNotMatch(stage, /selectedCarFilters|setSort\(/);
  assert.match(carsClient, /setSelectedCarFilters/);
  assert.match(carsClient, /setSort\(option.value\)/);
});
