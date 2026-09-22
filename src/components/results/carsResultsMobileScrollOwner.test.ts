import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");

test("mobile Cars results keep one stable scroll owner below the complete header", () => {
  assert.equal(source.match(/data-cars-mobile-results-scroll-owner/g)?.length, 1);
  assert.match(source, /data-cars-mobile-results-scroll-owner[\s\S]{0,220}100dvh-61px-env\(safe-area-inset-top\)/);
  assert.match(source, /data-cars-mobile-results-scroll-owner[\s\S]{0,260}max-sm:overflow-y-auto/);
  assert.match(source, /data-cars-mobile-results-scroll-owner[\s\S]{0,300}-webkit-overflow-scrolling:touch/);
  assert.match(source, /root: mobileResultsScrollOwnerRef\.current/);
  assert.match(source, /acquireMobileResultsScrollLock\(\s*mobileResultsScrollOwnerRef\.current/);
});

test("mobile navigation helpers measure and move the same Results owner", () => {
  assert.match(source, /mobileScrollOwnerRef\?\.current\?\.scrollTop \?\? window\.scrollY/);
  assert.match(source, /\(owner \?\? window\)\.scrollTo\(\{ top, behavior: "auto" \}\)/);
  assert.match(source, /\(mobileScrollOwnerRef\?\.current \?\? window\)\.scrollTo\(\{ top: 0/);
});

test("the compact header fully paints its boundary above the Results scrollbar", () => {
  assert.match(source, /fixed inset-x-0 top-0[^"\n]*border-b border-\[#D8E1EC\]/);
  assert.match(source, /pb-1 pt-\[calc\(0\.25rem\+env\(safe-area-inset-top\)\)\]/);
  assert.match(source, /grid h-\[52px\]/);
});
