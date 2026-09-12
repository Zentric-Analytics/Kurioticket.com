import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const shell = readFileSync("src/components/results/deals/DealsJourneyShell.tsx", "utf8");
const stage = readFileSync("src/components/results/deals/DealsCarResultsStage.tsx", "utf8");
const carsClient = readFileSync("src/components/results/CarsResultsClient.tsx", "utf8");
const card = readFileSync("src/components/results/CarResultCard.tsx", "utf8");
const translations = readFileSync("src/lib/i18n/en.ts", "utf8");

test("guided Car results use the shared Cars results experience inside the journey shell", () => {
  assert.match(carsClient, /export function CarsResultsExperience/);
  assert.match(shell, /<DealsCarResultsStage\s+search=\{search\}/);
  assert.match(stage, /<CarsResultsExperience/);
  assert.doesNotMatch(stage, /<main|<h1|action="\/cars\/results"|desktopStickySearchSection|mobileSearchOpen|Breadcrumb/);
  assert.match(stage, /POST/);
  assert.match(stage, /\/api\/cars\/search/);
    assert.match(stage, /buildDealsCarRequestIdentity/);
  assert.match(stage, /AbortController/);
  assert.doesNotMatch(stage, /replaceDealsCarSelection|writeDealsStagedJourneyPlan|writeDealsTripPlan|removeDealsStagedJourneyPlan|markDealsProviderOpened|api\/redirect|bookingUrl|searchPolicy\.action\.href|cars\/details/);
});

test("guided structure provides accessible results and direct car selection with disabled invalid links", () => {
  assert.match(carsClient, /aria-labelledby=\{resultHeadingId\}/);
  assert.match(carsClient, /headingLevel=\{embedded \? "h3" : "h2"\}/);
  assert.match(carsClient, /<CarFilters/);
  assert.match(carsClient, /sortCarResults\(filterCarResults/);
  assert.match(carsClient, /detailsHrefForCar\(car\)/);
  assert.match(card, /detailsHref: string \| null/);
  assert.match(card, /detailsHref \? \(\s*<Link/);
  assert.match(card, /<button\s+type="button"\s+disabled/);
  assert.match(card, /min-h-11/);
  assert.match(shell, /onSelectCar=\{confirmGuidedCarSelection\}/);
  assert.match(shell, /const confirmGuidedCarSelection[\s\S]*?confirm\("car", selection\)/);
  assert.doesNotMatch(shell, /data-deals-guided-car-results-pending className/);
});

test("guided lifecycle source contract excludes filter and sort from request dependencies", () => {
  assert.match(stage, /useEffect\(\(\) => \{/);
  assert.match(stage, /\}, \[payloadJson, requestIdentity, retryGeneration\]\)/);
  assert.doesNotMatch(stage, /selectedCarFilters|setSort\(/);
  assert.match(carsClient, /setSelectedCarFilters/);
  assert.match(carsClient, /setSort\(option.value\)/);
});

test("guided Car results use the shared dynamic result count and shortened action", () => {
  assert.doesNotMatch(stage, /const heading = t\("deals\.guided\.carResults\.title"\)/);
  assert.doesNotMatch(stage, /resultHeading=\{heading\}/);
  assert.match(stage, /resultHeadingId="guided-car-results-heading"/);
  assert.match(stage, /resultHeadingRef=\{resultsHeadingRef\}/);
  assert.match(stage, /embedded/);
  assert.match(
    stage,
    /actionLabel=\{t\("deals\.guided\.carResults\.actionLabel"\)\}/,
  );
  assert.match(carsClient, /visibleResults\.length === 1/);
  assert.match(carsClient, /"resultFound"/);
  assert.match(carsClient, /"resultsFound"/);
  assert.match(carsClient, /Intl\.NumberFormat/);
  assert.match(carsClient, /format\(visibleResults\.length\)/);
  assert.match(
    translations,
    /"deals\.guided\.carResults\.actionLabel": "Continue with this car option"/,
  );
  assert.match(
    translations,
    /"deals\.guided\.carResults\.actionAriaLabel":\s*"Continue with \{model\} car option"/,
  );
  assert.match(
    translations,
    /"deals\.guided\.carResults\.title": "Car options for your trip"/,
  );
});


test("source-contract: guided filters launcher is mobile and tablet visible until desktop sidebar", () => {
  assert.match(carsClient, /className="inline-flex min-h-11[^"]*lg:hidden"/);
  assert.doesNotMatch(carsClient, /hidden h-10[^"]*sm:inline-flex lg:hidden/);
  assert.match(carsClient, /<aside\s+className="relative hidden lg:block self-stretch"[\s\S]*?<CarFilters/);
  assert.match(carsClient, /flex w-full min-w-0 flex-col items-start/);
});

test("source-contract: mobile drawer is conditional, focus trapped, restores safely, and releases scroll lock", () => {
  const experience = carsClient.slice(carsClient.indexOf("export function CarsResultsExperience"));
  assert.match(experience, /filtersOpen \? \(\s*<aside\s+ref=\{filtersDialogRef\}\s+tabIndex=\{-1\}\s+role="dialog"\s+aria-modal="true"/);
  assert.match(experience, /ref=\{quickFiltersDialogRef\} tabIndex=\{-1\} role="dialog" aria-modal="true"/);
  assert.match(experience, /activeCloseButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(experience, /event\.key === "Tab"/);
  assert.match(experience, /event\.shiftKey && document\.activeElement === first/);
  assert.match(experience, /!event\.shiftKey && document\.activeElement === last/);
  assert.match(experience, /event\.key === "Escape"[\s\S]*?setFiltersOpen\(false\);\s*setQuickFilterGroupId\(null\)/);
  assert.match(experience, /mobileFiltersScrollLockRef\.current = acquireMobileResultsScrollLock\(\)/);
  assert.match(experience, /releaseExistingLock\(\)/);
  assert.match(experience, /restoreOverlayLauncherFocus\(launcher, mobileFiltersModalityRef\.current\)/);
  assert.match(experience, /shouldRestoreFocus = false;\s*setFiltersOpen\(false\)/);
});

test("source-contract: standalone and guided adapters share the one Car result core", () => {
  assert.match(carsClient, /export function CarsResultsClient[\s\S]*<CarsResultsExperience[\s\S]*results=\{initialResults\}/);
  assert.match(stage, /<CarsResultsExperience[\s\S]*results=\{results\}/);
  assert.equal((carsClient.match(/sortCarResults\(filterCarResults/g) ?? []).length, 1);
  assert.equal((carsClient.match(/pageResults\.map\(\(car\) => \(\s*<CarResultCard/g) ?? []).length, 1);
  assert.equal((carsClient.match(/detailsHrefForCar\(car\)/g) ?? []).length, 1);
});

test("source-contract: Retry focus has distinct loading, success, empty, error targets and clears after terminal state", () => {
  assert.match(stage, /loadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /resultsHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /emptyHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /errorHeadingRef = useRef<HTMLHeadingElement \| null>\(null\)/);
  assert.match(stage, /state === "available"\)\s*resultsHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /state === "empty"\)\s*emptyHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stage, /state === "error"\)\s*errorHeadingRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
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
