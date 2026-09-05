import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const screen = read("src/features/search/ApprovedResultsScreen.tsx");
const resultContent = screen.slice(
  screen.indexOf("const resultContent"),
  screen.indexOf('if (status === "loading")'),
);

test("Hotel Results owns no brand or legal footer", () => {
  assert.doesNotMatch(screen, /import \{ HotelResultsBrandLegalFooter \}/);
  assert.doesNotMatch(screen, /<HotelResultsBrandLegalFooter/);
  assert.equal(screen.match(/HotelResultsBrandLegalFooter/g)?.length ?? 0, 0);
  assert.equal(existsSync(resolve("src/features/search/HotelResultsBrandLegalFooter.tsx")), false);
  assert.equal(existsSync(resolve("src/features/search/hotelResultsFooterCopy.ts")), false);
});

test("Hotel cards still end with conditional pagination and no replacement footer", () => {
  const cards = resultContent.indexOf("hotelPageResults.map");
  const pagination = resultContent.indexOf("<HotelResultsPagination");
  const afterPagination = resultContent.slice(pagination);

  assert.ok(cards >= 0 && cards < pagination);
  assert.match(
    resultContent,
    /product === "hotel" && sorted\.length \? <HotelResultsPagination page=\{clampedHotelPage\} pages=\{hotelPageCount\} disabled=\{hotelPageChanging\} onPage=\{changeHotelPage\}\/> : null/,
  );
  assert.doesNotMatch(afterPagination, /<Image|logo|tagline|Seller|copyright|Privacy|Terms|Cookies|footer|divider/i);
});

test("the screen owns compact collision-safe end clearance", () => {
  assert.match(
    screen,
    /style=\{\[s0\.body, \{ paddingBottom: Math\.max\(insets\.bottom \+ 72, 72\) \}\]\}/,
  );
  assert.equal(screen.match(/accessibilityLabel="Back to top"/g)?.length, 1);
});

test("Back-to-top geometry, safe-area position, and action remain unchanged", () => {
  assert.match(
    screen,
    /accessibilityLabel="Back to top"[\s\S]*?scrollTo\(\{y:0,animated:true}\)[\s\S]*?bottom:Math\.max\(insets\.bottom \+ 16,16\)/,
  );
  assert.match(
    screen,
    /hotelBackToTop:\s*\{[^}]*position:"absolute"[^}]*right:16[^}]*width:44[^}]*height:44[^}]*borderRadius:22/,
  );
});

test("Hotel Results remains without BottomNav", () => {
  const resultsScreen = screen.slice(screen.indexOf("export function ApprovedResultsScreen"), screen.indexOf("export function BottomNav"));
  assert.doesNotMatch(resultsScreen, /<BottomNav(?:\s|\/|>)/);
});
