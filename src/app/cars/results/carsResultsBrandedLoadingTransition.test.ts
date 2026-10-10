import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const loadingSource = readFileSync(
  new URL("./loading.tsx", import.meta.url),
  "utf8",
);

test("Cars streams branded results below the persistent Results header", () => {
  const headerIndex = pageSource.indexOf("<AppHeader");
  const suspenseIndex = pageSource.indexOf("<Suspense");

  assert.ok(headerIndex >= 0 && headerIndex < suspenseIndex);
  assert.ok(suspenseIndex < pageSource.indexOf("<CarsResultsContent values="));
  // The recorded loading-footer correction removed the extra page-level footer.
  assert.doesNotMatch(pageSource, /<Footer/);
  assert.match(pageSource, /fallback=\{[\s\S]*?<CarsResultsFallback/);
  assert.match(pageSource, /<BrandedLoading/);
});

test("Cars uses canonical JSON inventory rather than streaming every card in HTML", () => {
  const loader = readFileSync(new URL("../../../components/results/CarInventoryLoader.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(pageSource, /await searchCars\(/);
  assert.match(pageSource, /<CarInventoryLoader/);
  assert.match(loader, /fetch\("\/api\/cars\/search"/);
  assert.match(loader, /body: JSON.stringify\(values\)/);
  assert.match(loader, /controller.abort\(\), 60_000/);
  assert.match(loader, /Retry search/);
  assert.match(loader, /initialResults=\{results\}/);
  assert.doesNotMatch(loader, /results\.slice\(/);
});

test("the complete committed search identity resets boundary and client", () => {
  assert.match(pageSource, /const searchIdentity = JSON\.stringify\(values\)/);
  assert.match(pageSource, /<Suspense\s+key=\{searchIdentity\}/);
  assert.match(pageSource, /<CarInventoryLoader\s+key=\{searchIdentity\}/);

  const lagos = JSON.stringify({ pickupLocation: "Lagos", driverAge: "30" });
  const heathrow = JSON.stringify({
    pickupLocation: "Heathrow Airport (LHR)",
    driverAge: "30",
  });
  const manchester = JSON.stringify({
    pickupLocation: "Manchester Airport (MAN)",
    driverAge: "30",
  });
  assert.notEqual(lagos, heathrow);
  assert.notEqual(heathrow, manchester);
});

test("Cars loading uses localized rotating copy without an artificial delay", () => {
  for (const key of [
    "carsResults.loading.title",
    "carsResults.loading.checkingCarsAndRates",
    "carsResults.loading.comparingVehiclesAndProviders",
    "carsResults.loading.findingBestAvailableOptions",
    "carsResults.loading.preparingResults",
  ]) {
    assert.match(pageSource, new RegExp(key.replaceAll(".", "\\.")));
    assert.match(loadingSource, new RegExp(key.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(pageSource, /setTimeout|delay\s*\(/);
  assert.doesNotMatch(loadingSource, /setTimeout|delay\s*\(/);
  assert.match(pageSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(loadingSource, /<CarsResultsMobileSafeArea \/>/);
  assert.match(pageSource, /<AppHeader[\s\S]*stableMobileSafeAreaTop[\s\S]*\/>/);
  assert.match(loadingSource, /<AppHeader[\s\S]*stableMobileSafeAreaTop[\s\S]*\/>/);
  assert.doesNotMatch(loadingSource, /<AppHeader[\s\S]*mobileSurface="muted"[\s\S]*\/>/);
  assert.doesNotMatch(pageSource, /<AppHeader[\s\S]*mobileSurface="muted"[\s\S]*\/>/);
  assert.match(loadingSource, /min-h-\[calc\(100svh-5rem\)\]/);
  assert.doesNotMatch(loadingSource, /<Footer/);
});
