import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getLocationFieldDisplay } from "../../lib/search/locationFieldDisplay";

const cars = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
const alert = readFileSync(new URL("./CarPriceAlertControl.tsx", import.meta.url), "utf8");
const hotelAlert = readFileSync(new URL("./HotelPriceAlertControl.tsx", import.meta.url), "utf8");

test("Cars Results summary selects compact display values but retains canonical state", () => {
  assert.match(cars, /getLocationFieldDisplay\(pickupLocationLabel\)\.primary/);
  assert.match(cars, /getLocationFieldDisplay\(dropoffLocationLabel\)\.primary/);
  assert.match(cars, /returnToDifferentLocation\s*\? `\$\{pickupSummary\} → \$\{returnSummary\}`/);
  assert.match(cars, /value=\{pickupLocation\}/);
  assert.match(cars, /value=\{dropoffLocation\}/);

  const pickup = "Paris, France";
  const dropoff = "Lyon, France";
  assert.equal(getLocationFieldDisplay(pickup).primary, "Paris");
  assert.equal(`${getLocationFieldDisplay(pickup).primary} → ${getLocationFieldDisplay(dropoff).primary}`, "Paris → Lyon");
  assert.equal(pickup, "Paris, France");
  assert.equal(dropoff, "Lyon, France");
});

test("Cars has one alert after quick filters and before the result summary", () => {
  assert.equal(cars.match(/<CarPriceAlertControl/g)?.length, 1);
  const quickFilters = cars.indexOf("data-cars-results-quick-filters");
  const alertControl = cars.indexOf("<CarPriceAlertControl", quickFilters);
  const summary = cars.indexOf("data-cars-results-summary-row", alertControl);
  assert.ok(quickFilters >= 0 && quickFilters < alertControl && alertControl < summary);
});

test("Cars adds spacing only below the mobile price alert", () => {
  assert.match(alert, /data-cars-price-alert[\s\S]*?className="[^"]*\bmb-1\b[^"]*\bsm:mb-0\b/);
  assert.match(
    cars,
    /data-cars-results-toolbar[\s\S]*?className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-2"[\s\S]*?data-cars-results-summary-row/,
  );
  assert.match(cars, /items-start gap-2 pt-1 sm:gap-3 lg:py-1/);
  assert.doesNotMatch(cars, /data-cars-results-summary-row[^>]*className="[^"]*mt-/);
});

test("Cars alert preserves its existing switch presentation", () => {
  assert.match(alert, /<h2 className="[^"]*flex-1[^>]*>\{t\("carsResults\.priceTracking\.title"\)\}<\/h2>/);
  assert.match(alert, /role="switch"/);
  assert.match(alert, /aria-checked=\{tracking\}/);
  assert.match(alert, /tracking \? "border-\[#004BB8\] bg-\[#004BB8\]" : "border-slate-300 bg-slate-200"/);
});

test("Hotel mobile web uses a real tracking switch while desktop keeps Create price alert", () => {
  assert.match(hotelAlert, /role="switch"/);
  assert.match(hotelAlert, /aria-checked=\{Boolean\(isTracking\)\}/);
  assert.match(hotelAlert, /handleMobileToggle\(!isTracking\)/);
  assert.match(hotelAlert, /fetch\("\/api\/price-alerts", \{ cache: "no-store"/);
  assert.match(hotelAlert, /method: "PATCH"/);
  assert.match(hotelAlert, /status: "PAUSED"/);
  assert.match(hotelAlert, /status: "ACTIVE"/);
  assert.match(hotelAlert, /sm:hidden/);
  assert.match(hotelAlert, /hidden rounded-2xl[^"]*sm:block/);
  assert.match(hotelAlert, /travel\.account\.hotelAlert\.create/);
  assert.match(hotelAlert, /createPortal/);
});

test("Cars alert presentation leaves authentication, API, and canonical payload behavior intact", () => {
  assert.match(alert, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency\)/);
  assert.match(alert, /matchingAutomaticCarPriceAlert/);
  assert.match(alert, /fetch\("\/api\/price-alerts"/);
  assert.match(alert, /response\.status === 401/);
  assert.match(alert, /response\.status === 409/);
});
