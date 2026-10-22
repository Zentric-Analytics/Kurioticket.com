import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("./HotelDetailsMobile.module.css", import.meta.url),
  "utf8",
);

test("mobile Hotel rates keeps stay date and price alert on the same row", () => {
  assert.match(
    source,
    /className=\{styles\.ratesHeader\}[\s\S]*stay\.dates[\s\S]*<HotelPriceAlertControl/,
  );
  assert.match(
    styles,
    /\.ratesHeader \{ display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-block: 8px 4px; \}/,
  );
});

test("mobile Hotel rate card closes the gap under the rates header", () => {
  assert.match(styles, /\.rateList \{ display: grid; gap: 8px; padding-block: 2px 6px; \}/);
});
