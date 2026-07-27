import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const searchBarSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);

test("Hotel Results connects its measurement ref to the visible search form", () => {
  assert.match(resultsSource, /desktopFormRef={setDesktopSearchFormRef}/);
  assert.match(searchBarSource, /<form[\s\S]*?ref={setSearchPanelRef}/);
  assert.match(
    resultsSource,
    /desktopSearchFormRef\.current\?\.getBoundingClientRect\(\)\.bottom/,
  );
  assert.doesNotMatch(
    resultsSource,
    /desktopSearchFrameRef\.current\?\.getBoundingClientRect\(\)\.bottom/,
  );
});

test("Hotel Results keeps observer and animation-frame fallback coordination", () => {
  assert.match(resultsSource, /new IntersectionObserver\(scheduleUpdate/);
  assert.match(resultsSource, /addEventListener\("scroll", scheduleUpdate/);
  assert.match(resultsSource, /addEventListener\("resize", scheduleUpdate/);
  assert.match(
    resultsSource,
    /requestAnimationFrame\(updateDesktopSearchState\)/,
  );
  assert.match(resultsSource, /observer\?\.disconnect\(\)/);
  assert.match(resultsSource, /cancelAnimationFrame\(animationFrame\)/);
});

test("compact Hotel filters retain the shared visibility and placement helpers", () => {
  assert.match(resultsSource, /shouldShowDesktopCompactFilter\(\{/);
  assert.match(resultsSource, /calculateCompactFilterPlacement\(\{/);
  assert.match(resultsSource, /top: desktopCompactFilterTopOffset/);
  assert.match(resultsSource, /left: desktopCompactFilterFrame\.left/);
  assert.match(resultsSource, /width: desktopCompactFilterFrame\.width/);
});

test("Hotel sticky editor source contract preserves position and reuses HotelSearchBar", () => {
  assert.doesNotMatch(resultsSource, /scrollToFullHotelSearch|scrollIntoView/);
  assert.match(resultsSource, /desktopStickyHotelSearchOpen/);
  assert.match(resultsSource, /activeDesktopStickyHotelSearchSection/);
  assert.match(
    resultsSource,
    /stickyHotelScrollLockRef\.current = lockBodyScroll\(\)/,
  );
  assert.match(resultsSource, /focus\(\{ preventScroll: true \}\)/);
  assert.match(resultsSource, /role="dialog"/);
  assert.match(resultsSource, /aria-modal="true"/);
  assert.match(resultsSource, /aria-labelledby="sticky-hotel-search-title"/);
  assert.match(resultsSource, /id="sticky-hotel-search-dialog"/);
  assert.match(resultsSource, /event\.target === event\.currentTarget/);
  assert.match(
    resultsSource,
    /initialDestination=\{activeDesktopHotelSearchDraft\.destination\}/,
  );
  assert.match(resultsSource, /desktopPresentation="sticky-dialog"/);
  assert.match(
    resultsSource,
    /submitOnDesktopOpen=\{submitDesktopStickyHotelSearchOnOpen\}/,
  );
  assert.match(resultsSource, /idPrefix="sticky-hotel-search"/);
  assert.match(resultsSource, /idPrefix="hotel-results-full-search"/);

  const stickyBarStart = resultsSource.indexOf("key={`sticky-hotel-");
  const stickyBarEnd = resultsSource.indexOf("/>", stickyBarStart);
  assert.notEqual(stickyBarStart, -1);
  assert.doesNotMatch(
    resultsSource.slice(stickyBarStart, stickyBarEnd),
    /desktopFormRef/,
  );
});

test("HotelSearchBar sticky opt-in activates nested controls and namespaces IDs", () => {
  assert.match(
    searchBarSource,
    /desktopPresentation\?: "inline" \| "sticky-dialog"/,
  );
  assert.match(
    searchBarSource,
    /initialDesktopSection\?: "destination" \| "dates" \| "guests" \| null/,
  );
  assert.match(
    searchBarSource,
    /destinationInputRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(searchBarSource, /setDatesOpen\(true\)/);
  assert.match(searchBarSource, /setGuestsRoomsOpen\(true\)/);
  assert.match(
    searchBarSource,
    /mobileSearchPanelRef\.current\?\.requestSubmit\(\)/,
  );
  assert.match(
    searchBarSource,
    /aria-controls=\{`\$\{idPrefix\}-destination-suggestions`\}/,
  );
  assert.match(searchBarSource, /event\.stopImmediatePropagation\(\)/);
});
