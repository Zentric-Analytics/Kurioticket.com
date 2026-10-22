import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("sticky compact Hotel filters use the free space below the desktop navbar", () => {
  const start = source.indexOf("function StickyHotelPopularFilters");
  const end = source.indexOf("\nfunction PriceFilterControl", start);
  const section = source.slice(start, end);

  assert.match(section, /sticky top-\[88px\]/);
  assert.match(section, /max-h-\[calc\(100vh-100px\)\]/);
  assert.match(section, /overflow-y-auto/);
  assert.doesNotMatch(section, /top-\[170px\]/);
  assert.doesNotMatch(section, /100vh-180px/);
});

test("raising the compact Hotel filter does not alter its filter controls", () => {
  const start = source.indexOf("function StickyHotelPopularFilters");
  const end = source.indexOf("\nfunction PriceFilterControl", start);
  const section = source.slice(start, end);

  assert.match(section, /popularFilters\.map/);
  assert.match(section, /type="checkbox"/);
  assert.match(section, /checked=\{filter\.selected\}/);
  assert.match(section, /onChange=\{filter\.onToggle\}/);
});
