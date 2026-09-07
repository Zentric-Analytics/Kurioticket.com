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

test("Cars alert preserves its full title and follows Hotel mobile CTA colors", () => {
  const title = '<h2 className="whitespace-nowrap text-sm font-bold text-slate-950 sm:text-base">{t("travel.account.carAlert.title")}</h2>';
  assert.ok(alert.includes(title));
  assert.doesNotMatch(alert, /<h2 className="[^"]*truncate/);
  assert.match(alert, /flex-wrap[^"]*min-\[360px\]:flex-nowrap/);

  for (const colorContract of [
    "border border-[#004BB8]/20 bg-blue-50",
    "text-[#004BB8]",
    "hover:border-[#004BB8]/35 hover:bg-blue-100",
    "focus-visible:ring-[#004BB8]/30",
    "sm:border-transparent sm:bg-[#004BB8]",
    "sm:text-white sm:hover:bg-[#003f9c]",
  ]) {
    assert.ok(alert.includes(colorContract), `Cars CTA is missing ${colorContract}`);
    assert.ok(hotelAlert.includes(colorContract), `Hotel reference is missing ${colorContract}`);
  }
});

test("Cars alert presentation leaves authentication, API, and canonical payload behavior intact", () => {
  assert.match(alert, /buildCarPriceAlertPayload\(search, value, currency\)/);
  assert.match(alert, /fetch\("\/api\/price-alerts"/);
  assert.match(alert, /response\.status === 401/);
  assert.match(alert, /response\.status === 409/);
});
