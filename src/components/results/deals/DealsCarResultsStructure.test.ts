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


test("source-contract: guided filters launcher is mobile and tablet visible until desktop sidebar", () => {
  assert.match(carsClient, /className="inline-flex h-10[^"]*lg:hidden"/);
  assert.doesNotMatch(carsClient, /hidden h-10[^"]*sm:inline-flex lg:hidden/);
  assert.match(carsClient, /<aside className="relative hidden lg:block"><CarFilters/);
  assert.match(carsClient, /flex w-full min-w-0 flex-wrap items-center justify-between/);
});

test("source-contract: mobile drawer is conditional, focus trapped, restores safely, and releases scroll lock", () => {
  const experience = carsClient.slice(carsClient.indexOf("export function CarsResultsExperience"));
  assert.match(experience, /filtersOpen \? <aside ref=\{filtersDialogRef\} tabIndex=\{-1\} role="dialog" aria-modal="true"/);
  assert.equal((experience.match(/role="dialog" aria-modal="true"/g) ?? []).length, 1);
  assert.match(experience, /filtersCloseButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(experience, /event\.key === "Tab"/);
  assert.match(experience, /event\.shiftKey && document\.activeElement === first/);
  assert.match(experience, /!event\.shiftKey && document\.activeElement === last/);
  assert.match(experience, /event\.key === "Escape"\) setFiltersOpen\(false\)/);
  assert.match(experience, /mobileFiltersScrollLockRef\.current = lockBodyScroll\(\)/);
  assert.match(experience, /releaseExistingLock\(\)/);
  assert.match(experience, /isSafelyFocusableElement\(launcher\)/);
  assert.match(experience, /shouldRestoreFocus = false; setFiltersOpen\(false\)/);
});

test("source-contract: standalone and guided adapters share the one Car result core", () => {
  assert.match(carsClient, /export function CarsResultsClient[\s\S]*<CarsResultsExperience[\s\S]*results=\{initialResults\}/);
  assert.match(stage, /<CarsResultsExperience[\s\S]*results=\{results\}/);
  assert.equal((carsClient.match(/sortCarResults\(filterCarResults/g) ?? []).length, 1);
  assert.equal((carsClient.match(/visibleResults\.map\(\(car\) => <CarResultCard/g) ?? []).length, 1);
  assert.equal((carsClient.match(/detailsHrefForCar\(car\)/g) ?? []).length, 1);
});

test("source-contract: Retry focus has distinct loading, success, empty, error targets and clears after terminal state", () => {
  assert.match(stage, /loadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /resultsHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /emptyHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /errorHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /state === "available"\) resultsHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /state === "empty"\) emptyHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /state === "error"\) errorHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /retryFocusRef\.current = false/);
  assert.match(stage, /resultHeadingRef=\{resultsHeadingRef\}/);
  assert.doesNotMatch(stage, /document\.body\.focus/);
});

test("source-contract: filters and sorting do not issue guided Cars requests while Retry does", () => {
  assert.match(stage, /\}, \[payloadJson, requestIdentity, retryGeneration\]\)/);
  assert.match(stage, /setRetryGeneration\(\(value\) => value \+ 1\)/);
  assert.doesNotMatch(stage, /selectedCarFilters|setSort\(/);
  assert.match(carsClient, /setSelectedCarFilters/);
  assert.match(carsClient, /setSort\(option\.value\)/);
});
