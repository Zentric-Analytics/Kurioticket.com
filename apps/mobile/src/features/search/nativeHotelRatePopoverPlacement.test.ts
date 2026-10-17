import assert from "node:assert/strict";
import test from "node:test";
import { placeHotelRatePopover } from "./nativeHotelRatePopoverPlacement";

test("native Hotel popover anchors next to the tapped info icon and stays inside viewport", () => {
  for (const width of [320, 375, 430]) {
    for (const x of [45, 160, width - 45]) {
      const p = placeHotelRatePopover({ x, y: 250, width: 20, height: 22 }, { width, height: 760 }, 400);
      assert.ok(p.left >= 12, "left viewport padding");
      assert.ok(p.left + p.width <= width - 12, "right viewport padding");
      assert.ok(p.top >= 12, "top viewport padding");
      assert.ok(p.top + 400 <= 760 - 12, "bottom viewport padding");
      assert.ok(p.width <= 304);
    }
  }
});

test("tall supplier details are scrollable within the safe viewport", () => {
  const p = placeHotelRatePopover({ x: 160, y: 720, width: 20, height: 22 }, { width: 375, height: 812 }, 1000);
  assert.equal(p.maxHeight, 788);
  assert.ok(p.top >= 12);
});

test("native rate presentation does not expand the card and keeps mobile web row measurements", () => {
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  const source = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
  const web = readFileSync("../../src/components/results/hotelDetails/HotelPriceComparisonSection.tsx", "utf8");
  assert.match(web, /min-h-\[76px\]/);
  assert.match(source, /dealCard: \{ minHeight: 76/);
  assert.match(source, /viewDealButton: \{ minHeight: 32/);
  assert.match(source, /priceColumn: \{ flexDirection: "row", alignItems: "baseline"/);
  assert.match(source, /<NativeHotelRatePopover/);
  assert.doesNotMatch(source, /expanded && infoAvailable/);
  assert.match(source, /onRequestClose=\{onClose\}/);
  assert.match(source, /accessibilityLabel="Close Rate details"/);
});
