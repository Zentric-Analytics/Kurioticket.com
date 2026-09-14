import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HOTEL_ALERT_DEFAULT_DROP_PERCENT,
  clampHotelAlertDropPercent,
  hotelAlertDesiredTotal,
  hotelAlertDropPercentForTarget,
} from "./hotelPriceAlertSliderModel";

test("hotel price alert percentage stays within the supported slider range", () => {
  assert.equal(clampHotelAlertDropPercent(-10), 1);
  assert.equal(clampHotelAlertDropPercent(18.6), 19);
  assert.equal(clampHotelAlertDropPercent(90), 50);
  assert.equal(clampHotelAlertDropPercent(Number.NaN), HOTEL_ALERT_DEFAULT_DROP_PERCENT);
});

test("hotel price alert derives desired total and percentage from current price", () => {
  assert.equal(hotelAlertDesiredTotal(1000, 10), 900);
  assert.equal(hotelAlertDesiredTotal(1000, 35), 650);
  assert.equal(hotelAlertDropPercentForTarget(1000, 650), 35);
});

test("hotel result price alert uses a stable slider sheet without numeric keyboard entry", () => {
  const component = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
  const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

  assert.match(results, /<HotelPriceAlert[\s\S]*?displayCurrency=\{currencyState\.resolution\.resolvedCurrency\}[\s\S]*?rates=\{currencyState\.rates\}/);
  assert.match(component, /<FlightRangeSlider[\s\S]*?singleMaximum/);
  assert.match(component, /Current total/);
  assert.match(component, /Drops by/);
  assert.match(component, /Desired total/);
  assert.match(component, /Create price alert/);
  assert.doesNotMatch(component, /TextInput|KeyboardAvoidingView|keyboardType|autoFocus/);
  assert.match(component, /buildHotelPriceAlertPayload\(plan, desiredTotal, displayCurrency\)/);
});
