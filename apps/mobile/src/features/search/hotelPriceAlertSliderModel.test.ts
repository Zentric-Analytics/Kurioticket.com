import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  HOTEL_ALERT_DEFAULT_DROP_PERCENT,
  clampHotelAlertDropPercent,
  hotelAlertDesiredTotal,
  hotelAlertDropPercentForTarget,
  hotelAlertPriceBasis,
  roundHotelAlertCurrencyAmount,
} from "./hotelPriceAlertSliderModel";

test("hotel price alert percentage stays within the supported slider range", () => {
  assert.equal(clampHotelAlertDropPercent(-10), 1);
  assert.equal(clampHotelAlertDropPercent(18.6), 19);
  assert.equal(clampHotelAlertDropPercent(90), 50);
  assert.equal(clampHotelAlertDropPercent(Number.NaN), HOTEL_ALERT_DEFAULT_DROP_PERCENT);
});

test("hotel price alert derives desired total and percentage from current price", () => {
  assert.equal(hotelAlertDesiredTotal(1000, 10, "USD"), 900);
  assert.equal(hotelAlertDesiredTotal(1000, 35, "USD"), 650);
  assert.equal(hotelAlertDropPercentForTarget(1000, 650), 35);
});

test("hotel alert targets use the selected currency precision", () => {
  assert.equal(roundHotelAlertCurrencyAmount(900.9, "JPY"), 901);
  assert.equal(hotelAlertDesiredTotal(1001, 10, "JPY"), 901);
  assert.equal(hotelAlertDesiredTotal(1001, 10, "USD"), 900.9);
});

test("hotel alert price basis keeps provider truth while presenting the resolved display currency", () => {
  const result = (totalPrice: number, currency: string) => ({ totalPrice, currency }) as never;
  assert.deepEqual(hotelAlertPriceBasis([result(120, "USD")], "NGN", {}), {
    amount: 120,
    currency: "USD",
    providerAmount: 120,
    providerCurrency: "USD",
  });
  assert.deepEqual(hotelAlertPriceBasis([result(120, "USD")], "NGN", { USD: 1, NGN: 1500 }), {
    amount: 180000,
    currency: "NGN",
    providerAmount: 120,
    providerCurrency: "USD",
  });
});

test("hotel result price alert uses a stable localized slider sheet without numeric keyboard entry", () => {
  const component = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
  const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

  assert.match(results, /<HotelPriceAlert[\s\S]*?displayCurrency=\{currencyState\.resolution\.resolvedCurrency\}[\s\S]*?rates=\{currencyState\.rates\}/);
  assert.match(component, /<FlightRangeSlider[\s\S]*?singleMaximum/);
  assert.match(component, /message\("currentTotal"\)/);
  assert.match(component, /message\("dropsBy"\)/);
  assert.match(component, /message\("targetTotal"\)/);
  assert.match(component, /message\("createAlert"\)/);
  assert.match(component, /hotelAlertPriceBasis\(hotelResults, displayCurrency, rates\)/);
  assert.match(component, /const providerCurrentTotal = priceBasis\?\.providerAmount/);
  assert.match(component, /const alertCurrency = priceBasis\?\.providerCurrency/);
  assert.match(component, /\(!available && !isTracking\)/);
  assert.doesNotMatch(component, /TextInput|KeyboardAvoidingView|keyboardType|autoFocus/);
  assert.match(component, /buildHotelPriceAlertPayload\(plan, alertTarget, alertCurrency\)/);
});

test("hotel result price alert preserves only paused targets represented by the slider", () => {
  const component = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
  assert.match(component, /const \[preservedPausedTarget, setPreservedPausedTarget\]/);
  assert.match(component, /matchingAlert\?\.status === "PAUSED"/);
  assert.match(component, /existingDropPercent >= HOTEL_ALERT_MIN_DROP_PERCENT/);
  assert.match(component, /existingDropPercent <= HOTEL_ALERT_MAX_DROP_PERCENT/);
  assert.match(component, /alertTarget = preservedPausedTarget\?\.currency === alertCurrency[\s\S]*?preservedPausedTarget\.target/);
  assert.match(component, /hotelAlertDropPercentForTarget\(providerCurrentTotal, existingTarget\)/);
  assert.match(component, /onChange=\{\(range\) => \{[\s\S]*?setPreservedPausedTarget\(null\);[\s\S]*?setDropPercent/);
  assert.match(component, /preservedPausedAlert[\s\S]*?updatePriceAlertStatus\(samePausedTarget\.id, "ACTIVE"\)/);
});

test("hotel result price alert sheet is safe-area aware and scrollable for large text", () => {
  const component = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
  assert.match(component, /useSafeAreaInsets/);
  assert.match(component, /<ScrollView[\s\S]*?contentContainerStyle=\{styles\.sheetContent\}/);
  assert.match(component, /paddingBottom: Math\.max\(insets\.bottom, 12\)/);
  assert.match(component, /sheet: \{ maxHeight: "92%"/);
});

test("hotel result price alert keeps the polished compact sheet geometry", () => {
  const component = readFileSync("src/features/search/HotelPriceAlert.tsx", "utf8");
  assert.match(component, /sheetContent: \{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, gap: 13 \}/);
  assert.match(component, /currentPriceCard: \{ minHeight: 58[\s\S]*paddingVertical: 8/);
  assert.match(component, /summary: \{ minHeight: 58[\s\S]*paddingVertical: 8/);
  assert.match(component, /metricValue: \{ marginTop: 1, fontSize: 15, lineHeight: 20/);
  assert.match(component, /create: \{ minHeight: 46/);
});
