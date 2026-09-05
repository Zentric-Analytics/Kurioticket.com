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
    /style=\{\[s0\.body, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}/,
  );
  assert.doesNotMatch(screen, /paddingBottom: Math\.max\(insets\.bottom \+ 72, 72\)/);
  assert.equal(screen.match(/accessibilityLabel="Back to top"/g)?.length, 1);
});

test("Back-to-top uses native scroll metrics to hide near the final content", () => {
  const handler = screen.slice(
    screen.indexOf("const handleHotelScroll"),
    screen.indexOf("const changeHotelPage"),
  );

  assert.match(screen, /const HOTEL_BACK_TO_TOP_HIDE_NEAR_END = 120/);
  assert.match(handler, /Math\.max\(0, event\.nativeEvent\.contentOffset\.y\)/);
  assert.match(handler, /event\.nativeEvent\.contentSize\.height[\s\S]*?- event\.nativeEvent\.layoutMeasurement\.height[\s\S]*?- scrollY/);
  assert.match(handler, /scrollY > 600[\s\S]*?&& distanceFromEnd > HOTEL_BACK_TO_TOP_HIDE_NEAR_END/);
  assert.match(handler, /visible === hotelBackToTopVisibleRef\.current[\s\S]*?setHotelBackToTop\(visible\)/);
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

test("BottomNav ownership remains Flight-only", () => {
  assert.match(screen, /\{flightResults \? <BottomNav flightResults \/> : null\}/);
  assert.doesNotMatch(screen, /<BottomNav flightResults=\{flightResults\} \/>/);
});
