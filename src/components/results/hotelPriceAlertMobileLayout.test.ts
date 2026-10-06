import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelPriceAlertControl.tsx", import.meta.url),
  "utf8",
);

test("mobile Hotel details price alert uses overview card copy and navbar search colour for bell button", () => {
  const start = source.indexOf('className="w-full sm:hidden"');
  const end = source.indexOf('      <div className={cn("hidden', start);
  const mobile = source.slice(start, end);

  assert.match(mobile, /Track prices/);
  assert.match(mobile, /Get automatic alerts when prices change\./);
  assert.match(mobile, /bg-\[#F5F7FB\]/);
  assert.match(mobile, /text-\[#142033\]/);
  assert.match(mobile, /rounded-xl border border-\[#D8E1EC\] bg-white/);
  assert.match(mobile, /h-\[24px\] w-\[42px\]/);
});
