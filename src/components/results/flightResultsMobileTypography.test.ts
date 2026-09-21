import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const mobileMarker = "/* The approved desktop FlightCard hierarchy compresses";
const mobile = css.split(mobileMarker)[1].split("@media (max-width: 359px)")[0];
const desktop = css.split(mobileMarker)[0];

test("mobile Flight Results uses the native compact hierarchy without changing desktop rules", () => {
  assert.match(css, /font-family: "Inter"/);
  assert.match(mobile, /flight-card-airline-name[\s\S]*?font-size: 0\.8125rem;[\s\S]*?font-weight: 700/);
  assert.match(mobile, /flight-card-flight-number[\s\S]*?font-size: 0\.6875rem/);
  assert.match(mobile, /flight-card-time[\s\S]*?font-size: 0\.875rem;[\s\S]*?font-weight: 800/);
  assert.match(mobile, /flight-card-price[\s\S]*?font-size: 1\.1875rem;[\s\S]*?white-space: nowrap/);
  assert.match(mobile, /flight-card-view-button[\s\S]*?min-height: 44px/);
  assert.match(desktop, /\.flight-card-time \{[\s\S]*?font-size: 1\.125rem/);
});

test("long airline and numeric-price overflow protections remain in place", () => {
  assert.match(readFileSync(new URL("./FlightCard.tsx", import.meta.url), "utf8"), /flight-card-airline-name truncate whitespace-nowrap/);
  assert.match(mobile, /font-variant-numeric: tabular-nums/);
});
