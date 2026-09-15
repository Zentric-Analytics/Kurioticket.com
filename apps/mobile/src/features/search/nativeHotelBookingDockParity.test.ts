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

test("native Hotel removes the checkout-style dock from Rates, Overview, and Reviews", () => {
  assert.doesNotMatch(detailSource, /estimated stay total/);
  assert.doesNotMatch(detailSource, />Continue booking</);
  assert.doesNotMatch(detailSource, /s\.sticky|s\.dockContent|s\.dockPrice|s\.dockAction/);
  assert.doesNotMatch(detailSource, /continueButton|continuePressed|continueDisabled|continueText/);
  assert.match(detailSource, /contentContainerStyle=\{\{ paddingBottom: 24 \+ inset\.bottom \}\}/);
});

test("Rates keeps a compact price column without an inactive provider action", () => {
  assert.match(rateStyle("rateActionColumn", "price"), /width: 104[\s\S]*alignItems: "flex-end"[\s\S]*justifyContent: "flex-start"/);
  assert.doesNotMatch(ratesSource, /reserveButton|>Reserve<\/Text>|accessibilityRole="button"|onPress=\{\(\) => onSelectOffer\(row\.offerId\)\}/);
});

test("Rates show stay-level totals without a per-night label", () => {
  assert.match(ratesSource, /option\.displayPrice\?\.total/);
  assert.match(ratesSource, /\$\{total\.accessibilityLabel\} stay price/);
  assert.doesNotMatch(ratesSource, />per night<\/Text>|s\.perNight|perNight:/);
  assert.match(ratesSource, /Price on provider/);
});
