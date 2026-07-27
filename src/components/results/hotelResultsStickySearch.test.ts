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
  assert.match(resultsSource, /requestAnimationFrame\(updateDesktopSearchState\)/);
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
