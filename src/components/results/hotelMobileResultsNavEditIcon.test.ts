import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("mobile web Hotel results navbar uses an edit icon for the search summary", () => {
  const start = source.indexOf("const renderMobileHotelNavSearch");
  const end = source.indexOf("\n  return (", start);
  const section = source.slice(start, end);

  assert.match(section, /data-hotel-results-mobile-nav-search-button/);
  assert.match(section, /<SquarePen size=\{15\} strokeWidth=\{2\} \/>/);
  assert.doesNotMatch(section, /<Search|<PencilLine|<Pencil size/);
  assert.match(section, /text-\[#142033\]/);
});


test("Hotel mobile edit SquarePen has no icon-tile background", () => {
  const start = source.indexOf("data-hotel-results-mobile-nav-search-button");
  const end = source.indexOf("</button>", start);
  const section = source.slice(start, end);
  assert.match(section, /<SquarePen size=\{15\} strokeWidth=\{2\} \/>/);
  assert.doesNotMatch(section, /bg-\[#E6EFFD\]/);
  assert.match(section, /text-\[#142033\]/);
});
