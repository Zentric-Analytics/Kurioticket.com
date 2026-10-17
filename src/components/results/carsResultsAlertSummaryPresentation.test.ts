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
  assert.match(cars, /grid w-full min-w-0 grid-cols-\[minmax\(0,1fr\)_auto\] items-center gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1 sm:gap-x-2 sm:gap-y-3 sm:px-0/);
  assert.match(cars, /<CarPriceAlertControl search=\{search\} results=\{providerResults\} \/>/);
});

test("Cars aligns both mobile controls with a compact heading and leaves no separate tracking row", () => {
  assert.match(alert, /data-cars-price-alert\s+className="col-start-2 row-start-1 mb-0 w-auto min-w-0 max-w-full justify-self-end bg-transparent/);
  assert.match(alert, /min-h-11 min-w-0 items-center justify-end gap-1\.5 max-\[359px\]:gap-1 sm:min-h-\[52px\]/);
  assert.match(cars, /data-cars-results-toolbar[\s\S]*?data-cars-results-summary-row[\s\S]*?ref=\{resultHeadingRef\}[\s\S]*?<CarPriceAlertControl/);
  assert.match(cars, /items-start gap-2 pt-0 sm:gap-3 sm:pt-1 lg:py-1/);
  assert.doesNotMatch(cars, /data-cars-results-summary-row[^>]*className="[^"]*mt-/);
});

test("Cars results heading aligns to the inner card gutters and sits close to the first card on mobile", () => {
  const summaryClasses = cars.match(/className=\{cn\(\s*"([^"]+)",\s*!embedded && "lg:grid-cols-\[minmax\(0,1fr\)_auto_auto\] lg:gap-x-3 lg:gap-y-0",\s*\)\}\s+data-cars-results-summary-row/)?.[1];
  assert.ok(summaryClasses, "the existing results-count and tracking row is retained");
  assert.match(summaryClasses, /grid-cols-\[minmax\(0,1fr\)_auto\] items-center/);
  assert.match(summaryClasses, /gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1/);
  assert.match(summaryClasses, /sm:gap-x-2 sm:gap-y-3 sm:px-0/);
  assert.match(cars, /gap-2 pt-0 sm:gap-3 sm:pt-1 lg:py-1",\s*!embedded && presentation === "standalone" && "max-sm:pt-2",\s*\)\}\s*data-cars-results-toolbar/);
  assert.equal(
    (cars.match(/"w-full space-y-3\.5 sm:space-y-4",\s*!embedded && presentation === "standalone" \? "max-sm:!mt-0" : "max-sm:!mt-1"/g) ?? []).length,
    2,
    "loading and loaded car lists share the same standalone-mobile spacing beneath the results heading",
  );
  assert.doesNotMatch(cars, /w-full space-y-3\.5 max-sm:!mt-2\.5/);
  assert.doesNotMatch(cars, /w-full space-y-3\.5 max-sm:!mt-1\.5/);
  assert.doesNotMatch(cars, /w-full space-y-3\.5 max-sm:!mt-0\.5/);
  assert.match(alert, /min-h-11 min-w-0 items-center justify-end gap-1\.5 max-\[359px\]:gap-1 sm:min-h-\[52px\]/);
  assert.match(alert, /flex h-11 w-\[51px\] shrink-0 items-center justify-end/);
  assert.match(alert, /className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full[^"]*sm:w-12 lg:h-9"/);
  assert.match(alert, /aria-hidden="true" className=\{`relative inline-flex h-6 w-11[^}]*sm:h-7 sm:w-12/);
  assert.match(alert, /role="switch" aria-checked=\{tracking\}/);
});

test("Cars heading has balanced vertical clearance with the tighter mobile card gap", () => {
  const rowHeightPx = 44;
  const switchHeightPx = 24;
  const cardTopMarginPx = 0;
  const clearAboveTrack = (rowHeightPx - switchHeightPx) / 2;
  const clearBelowTrack = clearAboveTrack + cardTopMarginPx;
  assert.equal(clearAboveTrack, 10);
  assert.equal(clearBelowTrack, 10);
  assert.equal(clearBelowTrack, clearAboveTrack, "the tracking switch keeps symmetric visible clearance to the first card");
  assert.equal((cars.match(/"w-full space-y-3\.5 sm:space-y-4",\s*!embedded && presentation === "standalone" \? "max-sm:!mt-0" : "max-sm:!mt-1"/g) ?? []).length, 2);
  assert.match(alert, /flex min-h-11 min-w-0 items-center justify-end gap-1\.5/);
  assert.match(alert, /relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full/);
  assert.match(alert, /relative inline-flex h-6 w-11 shrink-0 items-center rounded-full/);
  assert.match(alert, /sm:h-7 sm:w-12/);
});


test("standalone mobile Cars redistributes space from the card gap to the filter separation", () => {
  const toolbar = cars.slice(cars.indexOf("data-cars-results-filter-origin"), cars.indexOf("data-cars-results-summary-row"));
  assert.match(toolbar, /!embedded && presentation === "standalone" && "max-sm:pt-2"/);
  assert.doesNotMatch(toolbar, /sm:pt-2 lg:pt-2/);
  // Both loading and loaded lists have zero mobile top margin only for standalone Cars.
  assert.equal((cars.match(/!embedded && presentation === "standalone" \? "max-sm:!mt-0" : "max-sm:!mt-1"/g) ?? []).length, 2);
  assert.match(cars, /min-w-0 space-y-0 sm:space-y-4/);
});

test("Cars leaves the entire left-side result count and grid placement unchanged", () => {
  assert.match(cars, /className=\{cn\("col-start-1 row-start-1 min-w-0", !embedded && "sm:row-start-2 lg:row-start-1"\)\}/);
  assert.match(cars, /className="truncate whitespace-nowrap text-\[12px\] font-semibold leading-4 tracking-\[-0\.002em\] text-\[#07133B\][^"]*max-\[359px\]:text-\[11px\] sm:text-\[14px\]/);
  assert.match(cars, /grid w-full min-w-0 grid-cols-\[minmax\(0,1fr\)_auto\] items-center gap-x-1\.5 gap-y-0 px-2 max-\[359px\]:px-1/);
  assert.match(cars, /<CarPriceAlertControl search=\{search\} results=\{providerResults\} \/>/);
  assert.match(alert, /whitespace-nowrap text-\[12px\] font-semibold leading-\[17px\] text-\[#07133B\]/);
  assert.match(alert, /gap-1\.5 max-\[359px\]:gap-1 sm:min-h-\[52px\]/);
  assert.match(alert, /h-11 w-\[51px\] shrink-0 items-center justify-end/);
  assert.match(alert, /role="switch" aria-checked=\{tracking\}/);
});

test("desktop Cars places a compact Track prices control beside Sort without changing the mobile or tablet row", () => {
  const alertStart = alert.indexOf("data-cars-price-alert");
  const alertEnd = alert.indexOf("</section>", alertStart);
  const alertMarkup = alert.slice(alertStart, alertEnd);
  assert.match(alertMarkup, /sm:col-span-2 sm:col-start-1 sm:row-start-1 sm:w-full/);
  assert.match(alertMarkup, /lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:w-fit lg:max-w-\[240px\]/);
  assert.doesNotMatch(alertMarkup, /lg:w-\[calc\(100%_-_12rem\)\]/);
  assert.match(cars, /!embedded && "lg:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\] lg:gap-x-3 lg:gap-y-0"/);
  assert.match(alertMarkup, /lg:justify-self-center/);
  assert.match(cars, /!embedded && "sm:row-start-2 lg:row-start-1"/);
  assert.match(cars, /!embedded && "sm:row-start-2 lg:col-start-3 lg:row-start-1"/);
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
