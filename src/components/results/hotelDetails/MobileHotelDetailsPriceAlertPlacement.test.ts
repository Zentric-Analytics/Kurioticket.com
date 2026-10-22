import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);

test("mobile Hotel price alert appears in Overview directly under the stay editor", () => {
  const ratesStart = source.indexOf('{tab === "rates"');
  const overviewStart = source.indexOf('{tab === "overview"');
  const ratesSource = source.slice(ratesStart, overviewStart);
  const overviewSource = source.slice(overviewStart);

  assert.doesNotMatch(ratesSource, /<HotelPriceAlertControl/);
  assert.match(
    overviewSource,
    /className=\{styles\.stay\}[\s\S]*<HotelPriceAlertControl[\s\S]*className=\{styles\.section\}/,
  );
});
