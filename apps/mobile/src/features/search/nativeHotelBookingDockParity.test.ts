import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detailSource = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const ratesSource = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
const webSource = readFileSync(
  "../../src/components/results/hotelDetails/StandaloneHotelDetails.tsx",
  "utf8",
);
const webDock = webSource.slice(
  webSource.lastIndexOf("<section", webSource.indexOf("data-mobile-hotel-stay-dock")),
  webSource.indexOf("</section>", webSource.indexOf("data-mobile-hotel-stay-dock")),
);

function rateStyle(name: string, nextName?: string) {
  const start = ratesSource.indexOf(`  ${name}:`);
  const end = nextName
    ? ratesSource.indexOf(`  ${nextName}:`, start)
    : ratesSource.indexOf("\n});", start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName ?? "stylesheet end"} must follow ${name}`);
  return ratesSource.slice(start, end);
}

test("mobile web reference retains its independent Hotel stay dock contract", () => {
  for (const token of [
    "rounded-t-[22px]",
    "px-4",
    "safe-area-inset-bottom",
    "min-h-12",
    "rounded-lg",
    "font-bold",
  ]) assert.ok(webDock.includes(token), `mobile web dock must retain ${token}`);
});

test("native Hotel keeps one selected-provider dock visible across Rates, Overview, and Reviews", () => {
  assert.match(detailSource, /detailsStatus !== "loading" && selectedRate/);
  assert.match(detailSource, /s\.bookingDock/);
  assert.match(detailSource, /selectedRate\.totalPrice/);
  assert.match(detailSource, /selectedRate\.totalLabel/);
  assert.match(detailSource, /const bookingActionLabel = "View deal"/);
  assert.doesNotMatch(detailSource, /Continue to|Choose room/);
  assert.match(detailSource, /bookingDockButtonText\}>\{bookingActionLabel\}<\/Text>/);
  assert.match(detailSource, /onPress=\{\(\) => void continueSelectedRate\(\)\}/);
  assert.match(detailSource, /contentContainerStyle=\{\{ paddingBottom: selectedRate \? 120 \+ inset\.bottom : 24 \+ inset\.bottom \}\}/);
  const tabsEnd = detailSource.indexOf("</ScrollView>");
  const dock = detailSource.indexOf("s.bookingDock");
  assert.ok(tabsEnd >= 0 && dock > tabsEnd, "booking dock must sit outside tab-specific scrolling content");
});

test("Rates use independent selectable cards with the Flight radio treatment", () => {
  assert.match(rateStyle("dealList", "dealCard"), /gap: 10[\s\S]*paddingVertical: 12/);
  assert.match(rateStyle("dealCard", "dealCardSelectedLight"), /minHeight: 96[\s\S]*borderWidth: 1[\s\S]*borderRadius: 14[\s\S]*paddingHorizontal: 15[\s\S]*paddingVertical: 13/);
  assert.match(ratesSource, /const selectedBackground = theme\.dark \? "#142844" : "#F4F8FF"/);
  assert.match(ratesSource, /backgroundColor: selected[\s\S]*\? selectedBackground[\s\S]*: theme\.surface/);
  assert.match(ratesSource, /borderColor: selected \? accentColor : surfaceBorderColor/);
  assert.match(ratesSource, /accessibilityRole="radiogroup"/);
  assert.match(ratesSource, /accessibilityRole="radio"/);
  assert.match(ratesSource, /s\.dealRadioDot/);
  assert.doesNotMatch(ratesSource, /rateDivider|rateList|rateTitle|rateMeta|actionControl|Choose room/);
});

test("Rates show provider nightly prices while the persistent dock owns the selected stay total", () => {
  assert.match(ratesSource, /nightlyPrice:[\s\S]*nightlyPrice\.formatted/);
  assert.match(ratesSource, /totalPrice:[\s\S]*totalPrice\.formatted/);
  assert.equal(ratesSource.match(/totalLabel: "Stay total"/g)?.length, 2);
  assert.doesNotMatch(ratesSource, /totalLabel: "Estimated stay total"|estimated stay total/);
  assert.match(ratesSource, /"per night"/);
  assert.match(detailSource, /selectedRate\.totalAccessibilityLabel/);
});

