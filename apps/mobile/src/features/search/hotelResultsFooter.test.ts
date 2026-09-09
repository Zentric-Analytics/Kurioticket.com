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

test("the screen owns compact safe-area end clearance without a permanent button reserve", () => {
  assert.match(
    screen,
    /style=\{\[s0\.body, s0\.hotelResultsBody, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}/,
  );
  assert.match(screen, /hotelResultsBody: \{ paddingHorizontal: 14 \}/);
  assert.doesNotMatch(screen, /paddingBottom: Math\.max\(insets\.bottom \+ 72, 72\)/);
  assert.equal(screen.match(/accessibilityLabel="Back to top"/g)?.length ?? 0, 0);
});

test("Native Hotel Results has no floating Back-to-top affordance", () => {
  for (const removed of [
    /HOTEL_BACK_TO_TOP_HIDE_NEAR_END/,
    /hotelBackToTop/,
    /hotelBackToTopVisibleRef/,
    /setHotelBackToTop/,
    /handleHotelScroll/,
    /accessibilityLabel="Back to top"/,
    /\bArrowUp\b/,
  ]) assert.doesNotMatch(screen, removed);

  const owner = screen.match(/<ScrollView\s+ref=\{hotelScrollRef\}[\s\S]*?>/)?.[0];
  assert.ok(owner);
  assert.doesNotMatch(owner, /onScroll=|scrollEventThrottle=/);
});

test("Hotel scroll ref and result positioning remain available", () => {
  assert.match(screen, /const hotelScrollRef = useRef<ScrollView>\(null\)/);
  assert.match(screen, /ref=\{hotelScrollRef\}/);
  assert.match(screen, /hotelScrollRef\.current\?\.scrollTo\(\{ y: hotelResultsOffset\.current, animated: true \}\)/);
  assert.match(screen, /const hotelResultsOffset = useRef\(0\)/);
});

test("Hotel Results remains without BottomNav", () => {
  const resultsScreen = screen.slice(screen.indexOf("export function ApprovedResultsScreen"), screen.indexOf("export function BottomNav"));
  assert.doesNotMatch(resultsScreen, /<BottomNav(?:\s|\/|>)/);
});
