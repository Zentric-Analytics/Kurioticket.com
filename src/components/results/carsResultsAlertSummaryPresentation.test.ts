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

test("Cars keeps one tracking control in the results-count row, below quick filters", () => {
  assert.equal((cars.match(/<CarPriceAlertControl/g) ?? []).length, 1);
  const quickFilters = cars.indexOf("data-cars-results-quick-filters");
  const toolbar = cars.indexOf("data-cars-results-toolbar", quickFilters);
  const summary = cars.indexOf("data-cars-results-summary-row", toolbar);
  const count = cars.indexOf("ref={resultHeadingRef}", summary);
  const alertControl = cars.indexOf("<CarPriceAlertControl", summary);
  const sort = cars.indexOf("ref={carsSortRef}", summary);
  assert.ok(quickFilters >= 0 && quickFilters < toolbar && toolbar < summary);
  assert.ok(summary < count && count < alertControl && alertControl < sort);
  assert.match(cars, /grid w-full min-w-0 grid-cols-\[minmax\(0,1fr\)_auto\] items-center gap-x-2 gap-y-0 sm:gap-y-3/);
  assert.match(cars, /<CarPriceAlertControl search=\{search\} results=\{providerResults\} \/>/);
});

test("Cars aligns both mobile controls with a compact heading and leaves no separate tracking row", () => {
  assert.match(alert, /data-cars-price-alert\s+className="col-start-2 row-start-1 mb-0 w-auto min-w-0 max-w-full justify-self-end bg-transparent/);
  assert.match(alert, /min-h-\[52px\] min-w-0 items-center justify-end gap-1/);
  assert.match(cars, /data-cars-results-toolbar[\s\S]*?data-cars-results-summary-row[\s\S]*?ref=\{resultHeadingRef\}[\s\S]*?<CarPriceAlertControl/);
  assert.match(cars, /items-start gap-2 pt-1 sm:gap-3 lg:py-1/);
  assert.doesNotMatch(cars, /data-cars-results-summary-row[^>]*className="[^"]*mt-/);
});

test("desktop Cars alert stays full width above the separate count and Sort row", () => {
  const alertStart = alert.indexOf("data-cars-price-alert");
  const alertEnd = alert.indexOf("</section>", alertStart);
  const alertMarkup = alert.slice(alertStart, alertEnd);
  assert.match(alertMarkup, /sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:w-full/);
  assert.match(alertMarkup, /lg:mx-auto lg:w-\[calc\(100%_-_12rem\)\]/);
  assert.doesNotMatch(alertMarkup, /\blg:w-auto\b/);
  assert.match(cars, /!embedded && "sm:row-start-2"/);
  assert.match(cars, /col-start-2 row-start-1 hidden[^"]*sm:flex/);
});

test("Cars alert preserves its working switch and translated label", () => {
  assert.match(alert, /<h2 className="[^"]*sm:flex-1[^>]*>\{t\("carsResults\.priceTracking\.title"\)\}<\/h2>/);
  assert.match(alert, /role="switch"/);
  assert.match(alert, /aria-checked=\{tracking\}/);
  assert.match(alert, /tracking \? "border-\[#004BB8\] bg-\[#004BB8\]" : "border-slate-300 bg-slate-200"/);
});

test("Hotel mobile and desktop tracking switches share authenticated alert behavior", () => {
  assert.match(hotelAlert, /role="switch"/);
  assert.match(hotelAlert, /aria-checked=\{Boolean\(isTracking\)\}/);
  assert.match(hotelAlert, /handleToggle\(!isTracking, "mobile"\)/);
  assert.match(hotelAlert, /handleToggle\(!isTracking, "desktop"\)/);
  assert.match(hotelAlert, /fetch\("\/api\/price-alerts", \{\s*cache: "no-store"/);
  assert.match(hotelAlert, /method: "PATCH"/);
  assert.match(hotelAlert, /updateStatus\(matchingAlert, "PAUSED"\)/);
  assert.match(hotelAlert, /updateStatus\(samePausedTarget, "ACTIVE"\)/);
  assert.match(hotelAlert, /body: JSON.stringify\(\{ status: nextStatus \}\)/);
  assert.match(hotelAlert, /sm:hidden/);
  assert.match(hotelAlert, /hidden rounded-2xl[^"]*sm:block/);
  assert.match(hotelAlert, /travel\.account\.hotelAlert\.title/);
  assert.match(hotelAlert, /createPortal/);
});

test("Cars alert presentation leaves authentication, API, and canonical payload behavior intact", () => {
  assert.match(alert, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency\)/);
  assert.match(alert, /matchingAutomaticCarPriceAlert/);
  assert.match(alert, /fetch\("\/api\/price-alerts"/);
  assert.match(alert, /response\.status === 401/);
  assert.match(alert, /response\.status === 409/);
});
