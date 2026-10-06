import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

test("mobile Hotel details price alert mirrors the compact desktop treatment", () => {
  const start = source.indexOf('className="flex w-full justify-end sm:hidden"');
  const end = source.indexOf('      <div className={cn("hidden', start);
  const mobile = source.slice(start, end);

  assert.match(mobile, /justify-end/);
  assert.match(mobile, /inline-flex h-8 items-center gap-1 rounded-lg border border-\[#9299A9\] bg-transparent/);
  assert.match(mobile, /text-\[#1A1A1A\]/);
  assert.match(mobile, /text-\[12px\] font-semibold/);
  assert.match(mobile, /relative ms-0\.5 inline-flex h-\[18px\] w-8/);
  assert.match(mobile, /h-3\.5 w-3\.5/);
  assert.doesNotMatch(mobile, /bg-\[#F0F5FC\]|border-b border-\[#E7ECF5\]/);
});
