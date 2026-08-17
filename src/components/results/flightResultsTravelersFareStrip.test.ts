import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

test("nearby fares stay inside one ten-day request window", () => {
  assert.match(source, /const nearbyFareRangeSize = 10;/);
  assert.match(source, /const nearbyFareVisibleCount = 7;/);
  assert.match(source, /nearbyFares\.slice\(/);
  assert.match(source, /nearbyFareRangeSize - nearbyFareVisibleCount/);
  assert.doesNotMatch(source, /setFareWindowStart/);
});

test("desktop traveler rows use title-case labels and moderate controls", () => {
  const desktopRows = source.slice(
    source.indexOf('label={t("adults")}'),
    source.indexOf("function CounterRow"),
  );
  assert.match(desktopRows, /label={t\("adults"\)}/);
  assert.match(desktopRows, /label={t\("children"\)}/);
  assert.match(desktopRows, /label={t\("infants"\)}/);
  assert.match(desktopRows, /presentation="desktop"/);
  assert.match(source, /presentation === "desktop" \? "h-10 w-10"/);
});

test("long nearby-fare currency values use adaptive sizing without wrapping", () => {
  assert.match(source, /data-price-size=/);
  assert.match(styles, /flight-fare-strip-price\[data-price-size="long"\]/);
  assert.match(
    styles,
    /flight-fare-strip-price\[data-price-size="extra-long"\]/,
  );
  assert.match(styles, /white-space: nowrap/);
  assert.match(styles, /max-width: 100%/);
});
