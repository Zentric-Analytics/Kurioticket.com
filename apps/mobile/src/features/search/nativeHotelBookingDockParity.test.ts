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

test("native Hotel keeps one selected-rate dock visible across Rates, Overview, and Reviews", () => {
  assert.match(detailSource, /detailsStatus !== "loading" && selectedRate/);
  assert.match(detailSource, /s\.bookingDock/);
  assert.match(detailSource, /selectedRate\.totalPrice/);
  assert.match(detailSource, /selectedRate\.totalLabel/);
  assert.match(detailSource, />Choose room<\/Text>/);
  assert.match(detailSource, /onPress=\{\(\) => void continueSelectedRate\(\)\}/);
  assert.match(detailSource, /contentContainerStyle=\{\{ paddingBottom: selectedRate \? 124 \+ inset\.bottom : 24 \+ inset\.bottom \}\}/);
  const tabsEnd = detailSource.indexOf("</ScrollView>");
  const dock = detailSource.indexOf("s.bookingDock");
  assert.ok(tabsEnd >= 0 && dock > tabsEnd, "booking dock must sit outside tab-specific scrolling content");
});

test("Rates use compact grouped rows, keep a single rate white, and mark only multi-rate selection", () => {
  assert.match(rateStyle("rateList", "rateDivider"), /borderWidth: 1[\s\S]*borderRadius: 10[\s\S]*overflow: "hidden"/);
  assert.match(rateStyle("rateCard", "selectedBar"), /minHeight: 88[\s\S]*paddingHorizontal: 16[\s\S]*paddingVertical: 10[\s\S]*position: "relative"/);
  assert.match(rateStyle("selectedBar", "rateCardPressed"), /position: "absolute"[\s\S]*left: 0[\s\S]*top: 0[\s\S]*bottom: 0[\s\S]*width: 3/);
  assert.match(ratesSource, /const showSelectionMarker = rows\.length > 1 && selected/);
  assert.match(ratesSource, /\{ backgroundColor: theme\.surface \}/);
  assert.match(ratesSource, /showSelectionMarker \? \([\s\S]*?s\.selectedBar/);
  assert.match(ratesSource, /onPress=\{row\.actionable \? \(\) => onSelectRate\(row\.id\) : undefined\}/);
  assert.match(ratesSource, /<View style=\{\[s\.rateDivider, \{ backgroundColor: theme\.border \}\]\} \/>/);
  assert.doesNotMatch(ratesSource, /selectedBackground|<Check|selectedMark|borderColor: selected|borderWidth: selected|accessibilityRole="radio"|radioDot/);
  assert.doesNotMatch(ratesSource, /actionControl|actionLabel: "Choose room"/);
});

test("Rates show nightly prices while the persistent dock owns the selected stay total", () => {
  assert.match(ratesSource, /nightlyPrice: nightly\?\.formatted/);
  assert.match(ratesSource, /totalPrice: total\?\.formatted/);
  assert.match(ratesSource, /totalLabel: "Estimated stay total"/);
  assert.match(ratesSource, /totalLabel: "Stay total"/);
  assert.match(ratesSource, />per night<\/Text>/);
  assert.match(detailSource, /selectedRate\.totalAccessibilityLabel/);
});
