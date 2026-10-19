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

test("Cars removes tracking from results summary and map while keeping the summary order", () => {
  const quickFilters = cars.indexOf("data-cars-results-quick-filters");
  const toolbar = cars.indexOf("data-cars-results-toolbar", quickFilters);
  const summary = cars.indexOf("data-cars-results-summary-row", toolbar);
  const count = cars.indexOf("ref={resultHeadingRef}", summary);
  const sort = cars.indexOf("ref={carsSortRef}", summary);
  const map = cars.indexOf("<CarsResultsMapPreview");
  const filters = cars.indexOf("<CarFilters", map);
  assert.ok(quickFilters >= 0 && quickFilters < toolbar && toolbar < summary);
  assert.ok(summary < count && count < sort);
  assert.ok(map >= 0 && map < filters);
  assert.doesNotMatch(cars, /<CarPriceAlertControl|desktopCarPriceAlertTarget|data-cars-price-alert-sidebar-slot/);
  assert.match(cars, /grid w-full min-w-0 grid-cols-\[minmax\(0,1fr\)_auto\] items-center gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1/);
});

test("Cars keeps compact result-count alignment after relocating price tracking", () => {
  assert.match(cars, /data-cars-results-toolbar[\s\S]*?data-cars-results-summary-row[\s\S]*?ref=\{resultHeadingRef\}/);
  assert.doesNotMatch(cars, /<CarPriceAlertControl/);
  assert.match(cars, /items-start gap-2 pt-0 sm:gap-3 sm:pt-1 lg:py-1/);
  assert.doesNotMatch(cars, /data-cars-results-summary-row[^>]*className="[^"]*mt-/);
});

test("Cars results heading keeps the compact mobile gutters and card gap without a tracking bar", () => {
  const summaryClasses = cars.match(/className=\{cn\(\s*"([^"]+)",\s*!embedded && "lg:grid-cols-\[minmax\(0,1fr\)_auto\] lg:gap-x-3 lg:gap-y-0",\s*\)\}\s+data-cars-results-summary-row/)?.[1];
  assert.ok(summaryClasses);
  assert.match(summaryClasses, /grid-cols-\[minmax\(0,1fr\)_auto\] items-center/);
  assert.match(summaryClasses, /gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1/);
  assert.match(summaryClasses, /sm:gap-x-2 sm:gap-y-3 sm:px-0/);
  assert.equal((cars.match(/"w-full space-y-3\.5 sm:space-y-4",\s*!embedded && presentation === "standalone" \? "max-sm:!mt-2" : "max-sm:!mt-1"/g) ?? []).length, 2);
  assert.doesNotMatch(cars, /w-full space-y-3\.5 max-sm:!mt-2\.5/);
  assert.match(alert, /className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full/);
});

test("Cars count row preserves card separation after removing the tracking toggle", () => {
  assert.equal((cars.match(/"w-full space-y-3\.5 sm:space-y-4",\s*!embedded && presentation === "standalone" \? "max-sm:!mt-2" : "max-sm:!mt-1"/g) ?? []).length, 2);
  assert.match(cars, /data-cars-results-summary-row/);
  assert.match(alert, /flex min-h-11 w-full min-w-0 items-center gap-2/);
  assert.match(alert, /relative inline-flex h-6 w-11 shrink-0 items-center rounded-full/);
  assert.doesNotMatch(cars, /<CarPriceAlertControl/);
});

test("standalone mobile Cars preserves filter-to-count spacing while adding a small first-card gap", () => {
  const toolbar = cars.slice(cars.indexOf("data-cars-results-filter-origin"), cars.indexOf("data-cars-results-summary-row"));
  assert.match(toolbar, /!embedded && presentation === "standalone" && "max-sm:pt-6"/);
  assert.doesNotMatch(toolbar, /sm:pt-2 lg:pt-2/);
  // Both loading and loaded lists have the same 8px first-card gap only for standalone Cars.
  assert.equal((cars.match(/!embedded && presentation === "standalone" \? "max-sm:!mt-2" : "max-sm:!mt-1"/g) ?? []).length, 2);
  assert.match(cars, /min-w-0 space-y-0 sm:space-y-4/);
  assert.doesNotMatch(toolbar, /max-sm:pt-(?:0|1|2|3|4|5)\b/);
  assert.match(cars, /!embedded && presentation === "standalone" \? "max-sm:!mt-2" : "max-sm:!mt-1"/);
});

test("Cars keeps the left-side result count while the offer alert lives in rate details", () => {
  const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  assert.match(cars, /className=\{cn\("col-start-1 row-start-1 min-w-0", !embedded && "sm:row-start-2 lg:row-start-1 lg:min-w-max"\)\}/);
  assert.match(cars, /grid w-full min-w-0 grid-cols-\[minmax\(0,1fr\)_auto\] items-center gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1/);
  assert.match(picker, /data-car-rate-provider-alert-row/);
  assert.match(picker, /<CarPriceAlertControl/);
  assert.match(alert, /role="switch" aria-checked=\{tracking\}/);
});

test("desktop Cars retains map width while tracking resides within each provider offer", () => {
  const picker = readFileSync(new URL("./CarDealPicker.tsx", import.meta.url), "utf8");
  assert.match(cars, /<CarsResultsMapPreview location=\{search\.pickupLocation\} \/>/);
  assert.doesNotMatch(cars, /data-cars-price-alert-sidebar-slot|desktopCarPriceAlertTarget/);
  assert.match(cars, /!embedded && "lg:grid-cols-\[minmax\(0,1fr\)_auto\] lg:gap-x-3 lg:gap-y-0"/);
  assert.match(cars, /!embedded && "sm:row-start-2 lg:row-start-1 lg:min-w-max"/);
  assert.match(cars, /col-start-2 row-start-1 hidden[^"]*sm:flex/);
  assert.match(picker, /data-car-rate-provider-alert-row/);
});

test("Cars offer alert keeps the functional switch and accessible translated name", () => {
  assert.match(alert, /\{t\("carsResults\.priceTracking\.title"\)\}<\/span>/);
  assert.match(alert, /aria-label=\{`${t\("carsResults\.priceTracking\.title"\)\} for $\{scope\.providerName\} offer`\}/);
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

test("Cars alert preserves authenticated API flow and selected-offer payload", () => {
  assert.match(alert, /buildAutomaticCarPriceAlertPayload\(search, baseline\.totalPrice, baseline\.currency, scope\)/);
  assert.match(alert, /matchingAutomaticCarPriceAlert/);
  assert.match(alert, /fetch\("\/api\/price-alerts"/);
  assert.match(alert, /response\.status === 401/);
  assert.match(alert, /response\.status === 409/);
});

