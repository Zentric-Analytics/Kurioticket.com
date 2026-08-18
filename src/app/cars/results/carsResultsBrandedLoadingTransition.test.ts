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
  const footerIndex = pageSource.indexOf("<Footer");

  assert.ok(headerIndex >= 0 && headerIndex < suspenseIndex);
  assert.ok(suspenseIndex < footerIndex);
  assert.match(pageSource, /fallback=\{[\s\S]*?<CarsResultsFallback/);
  assert.match(pageSource, /<BrandedLoading/);
});

test("the real Cars inventory search is inside async Suspense content", () => {
  const pageBody = pageSource.slice(
    pageSource.indexOf("export default async function CarsResultsPage"),
    pageSource.indexOf("async function CarsResultsContent"),
  );
  const contentBody = pageSource.slice(
    pageSource.indexOf("async function CarsResultsContent"),
    pageSource.indexOf("function CarsResultsFallback"),
  );

  assert.doesNotMatch(pageBody, /await searchCars\(/);
  assert.match(contentBody, /const inventory = await searchCars\(values\)/);
});

test("the complete committed search identity resets boundary and client", () => {
  assert.match(pageSource, /const searchIdentity = JSON\.stringify\(values\)/);
  assert.match(pageSource, /<Suspense\s+key=\{searchIdentity\}/);
  assert.match(pageSource, /<CarsResultsClient\s+key=\{searchIdentity\}/);

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
});
