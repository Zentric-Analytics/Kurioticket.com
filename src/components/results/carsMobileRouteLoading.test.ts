import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overlay = readFileSync(
  "src/components/results/CarsRouteLoadingOverlay.tsx",
  "utf8",
);
const branded = readFileSync(
  "src/components/layout/BrandedLoading.tsx",
  "utf8",
);
const carsMain = readFileSync("src/app/cars/page.tsx", "utf8");
const homepage = readFileSync("src/app/page.tsx", "utf8");
const searchTabs = readFileSync(
  "src/components/search/SearchTabs.tsx",
  "utf8",
);
const card = readFileSync(
  "src/components/results/CarResultCard.tsx",
  "utf8",
);
const details = readFileSync(
  "src/components/results/CarDetailsClient.tsx",
  "utf8",
);
const loadingCopy = readFileSync(
  "src/shared/presentation/searchLoadingPresentation.ts",
  "utf8",
);

test("Cars mobile route loader uses the shared Cars loading presentation and visible progress line", () => {
  assert.match(overlay, /searchType="car"/);
  assert.match(overlay, /showProgress/);
  assert.match(overlay, /showActivityDots=\{false\}/);
  assert.match(overlay, /accessibleProgress/);
  assert.match(overlay, /lg:hidden/);
  assert.match(branded, /showActivityDots\?: boolean/);
  assert.match(
    loadingCopy,
    /title: "Searching the best rental cars for you"/,
  );
  assert.match(loadingCopy, /"Preparing your car options…"/);
});

test("valid Cars main searches enter mobile pending only after validation", () => {
  const standalone = carsMain.slice(
    carsMain.indexOf("const handleSubmit"),
    carsMain.indexOf("if (isSubmitting)"),
  );
  assert.ok(
    standalone.indexOf("validateCarsForm") <
      standalone.indexOf("setIsSubmitting(true)"),
  );
  assert.ok(
    standalone.indexOf("setIsSubmitting(true)") <
      standalone.indexOf("router.push(href)"),
  );
  assert.match(carsMain, /<CarsRouteLoadingOverlay active \/>/);

  const homepageSubmit = searchTabs.slice(
    searchTabs.indexOf("const onCarsSubmit"),
    searchTabs.indexOf("const isCarsSearchDisabled"),
  );
  assert.ok(
    homepageSubmit.indexOf("validateCarsForm") <
      homepageSubmit.indexOf("onCarsResultsNavigationStart?.()"),
  );
  assert.ok(
    homepageSubmit.indexOf("onCarsResultsNavigationStart?.()") <
      homepageSubmit.indexOf("router.push(href)"),
  );
  assert.match(homepage, /<CarsRouteLoadingOverlay active \/>/);
  assert.doesNotMatch(
    standalone + homepageSubmit,
    /setTimeout|sleep|delay\(/,
  );
});

test("mobile View deal starts Cars loading without changing the destination href", () => {
  assert.match(card, /const \[mobileDetailsPending, setMobileDetailsPending\] = useState\(false\)/);
  assert.match(card, /setMobileDetailsPending\(true\);\s*startRouteProgress\(\);/);
  assert.match(
    card,
    /href=\{detailsHref\}[\s\S]*?aria-disabled=\{mobileDetailsPending\}[\s\S]*?onClick=\{handleMobileDetailsNavigation\}/,
  );
  assert.match(card, /<CarsRouteLoadingOverlay active=\{mobileDetailsPending\} \/>/);
  assert.equal(
    (card.match(/prefetch=\{car\.inventorySource === "kayak-sandbox" \? false : undefined\}/g) ?? []).length,
    2,
  );
});

test("mobile Cars details back link shows pending while preserving resultsHref", () => {
  assert.match(details, /const \[mobileResultsPending, setMobileResultsPending\] = useState\(false\)/);
  assert.match(details, /setMobileResultsPending\(true\);\s*startRouteProgress\(\);/);
  assert.match(
    details,
    /href=\{resultsHref\}[\s\S]*?aria-disabled=\{mobileResultsPending\}[\s\S]*?onClick=\{handleMobileResultsNavigation\}[\s\S]*?data-car-details-mobile-back/,
  );
  assert.match(details, /<CarsRouteLoadingOverlay active=\{mobileResultsPending\} \/>/);
});
