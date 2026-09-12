import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
const screen = read("src/features/search/ApprovedResultsScreen.tsx");
const hotelList = screen.slice(
  screen.indexOf("<SectionList", screen.indexOf("<HotelResultsHeader")),
  screen.indexOf("/>\n", screen.indexOf("removeClippedSubviews", screen.indexOf("<HotelResultsHeader"))) + 2,
);

test("Hotel Results owns no brand or legal footer", () => {
  assert.doesNotMatch(screen, /import \{ HotelResultsBrandLegalFooter \}/);
  assert.doesNotMatch(screen, /<HotelResultsBrandLegalFooter/);
  assert.equal(screen.match(/HotelResultsBrandLegalFooter/g)?.length ?? 0, 0);
  assert.equal(existsSync(resolve("src/features/search/HotelResultsBrandLegalFooter.tsx")), false);
  assert.equal(existsSync(resolve("src/features/search/hotelResultsFooterCopy.ts")), false);
});

test("Hotel cards still end with conditional pagination and no replacement footer", () => {
  const cards = hotelList.indexOf("<HotelCard");
  const pagination = hotelList.indexOf("<HotelResultsPagination");
  const afterPagination = hotelList.slice(pagination);

  assert.ok(cards >= 0 && cards < pagination);
  assert.match(
    hotelList,
    /ListFooterComponent=\{status === "ready" && sorted\.length \? \([\s\S]*?<HotelResultsPagination page=\{clampedHotelPage\} pages=\{hotelPageCount\} disabled=\{hotelPageChanging\} onPage=\{changeHotelPage\}\/>/,
  );
  assert.doesNotMatch(afterPagination, /<Image|logo|tagline|Seller|copyright|Privacy|Terms|Cookies|footer|divider/i);
});

test("the screen owns the measured hotel-card inset and compact safe-area end clearance", () => {
  assert.match(
    screen,
    /contentContainerStyle=\{\[s0\.hotelResultsContent, \{ paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\) \}\]\}/,
  );
  assert.match(screen, /hotelResultsBody: \{ paddingHorizontal: 16 \}/);
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

  const owner = screen.match(/<SectionList\s+ref=\{hotelResultsListRef\}[\s\S]*?alwaysBounceVertical=\{false\}[\s\S]*?>/)?.[0];
  assert.ok(owner);
  assert.doesNotMatch(owner, /onScroll=|scrollEventThrottle=/);
});

test("Hotel scroll ref and result positioning remain available", () => {
  assert.match(screen, /const hotelResultsListRef = useRef<SectionList<HotelResultsListItem>>\(null\)/);
  assert.match(screen, /ref=\{hotelResultsListRef\}/);
  assert.match(screen, /hotelResultsListRef\.current\?\.scrollToLocation\(\{ sectionIndex: 0, itemIndex: 1, viewPosition: 0, animated \}\)/);
  assert.match(screen, /const scrollToHotelResultsBeginning = useCallback/);
});

test("Hotel Results remains without BottomNav", () => {
  const resultsScreen = screen.slice(screen.indexOf("export function ApprovedResultsScreen"), screen.indexOf("export function BottomNav"));
  assert.doesNotMatch(resultsScreen, /<BottomNav(?:\s|\/|>)/);
});
