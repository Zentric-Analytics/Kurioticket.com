import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const pendingStart = source.indexOf("\n  if (carsResultsPending) {");
const pendingBranch = source.slice(
  pendingStart,
  source.indexOf("\n  return (", pendingStart + 1),
);
const homepageBranch = source.slice(
  source.indexOf("\n  return (", pendingStart + 1),
);

test("homepage wires Cars navigation pending to mobile and desktop SearchTabs", () => {
  assert.equal(
    (
      homepageBranch.match(
        /onCarsResultsNavigationStart=\{handleCarsResultsNavigationStart\}/g,
      ) ?? []
    ).length,
    2,
  );
  assert.match(
    source,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/,
  );
  assert.doesNotMatch(
    source.slice(
      source.indexOf("const handleCarsResultsNavigationStart"),
      pendingStart,
    ),
    /setTimeout|startTransition|flushSync/,
  );
});

test("homepage Cars pending structurally replaces homepage and Footer with Results loading", () => {
  for (const prop of [
    "flushDesktopBottom",
    "flushMobileBottom",
    "hideDesktopTravelNav",
    "hideMobileCategoryTabs",
  ]) {
    assert.ok(pendingBranch.includes(prop), prop);
  }
  assert.match(pendingBranch, /<BrandedLoading/);
  assert.match(pendingBranch, /variant="fullscreen"/);
  assert.match(pendingBranch, /visual="logoPulse"/);
  assert.match(pendingBranch, /showProgress=\{false\}/);
  for (const key of [
    "carsResults.loading.title",
    "carsResults.loading.checkingCarsAndRates",
    "carsResults.loading.comparingVehiclesAndProviders",
    "carsResults.loading.findingBestAvailableOptions",
    "carsResults.loading.preparingResults",
  ]) {
    assert.ok(pendingBranch.includes(key), key);
  }
  assert.doesNotMatch(
    pendingBranch,
    /<SearchTabs|<Footer|mobile-homepage-hero|homepage-content-after-search/,
  );
  assert.match(homepageBranch, /<SearchTabs/);
  assert.match(homepageBranch, /<Footer/);
});
