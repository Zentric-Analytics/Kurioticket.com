import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

test("mobile Hotel details price alert uses compact inline placement", () => {
  const start = source.indexOf('className="flex min-h-11 items-center gap-2.5');
  const end = source.indexOf('      <div className={cn("hidden', start);
  const mobile = source.slice(start, end);

  assert.match(mobile, /border-b border-\[#E7ECF5\]/);
  assert.match(mobile, /text-\[#1A1A1A\]/);
  assert.match(mobile, /className="truncate text-\[12\.5px\] font-bold leading-4 text-\[#1A1A1A\]"/);
  assert.match(mobile, /className=\{cn\(\s*"relative ms-1 inline-flex h-\[28px\] w-\[49px\]/);
  assert.doesNotMatch(mobile, /flex-1/);
  assert.doesNotMatch(mobile, /bg-\[#F0F5FC\]|rounded-xl border border-\[#D8E1EC\]/);
});
