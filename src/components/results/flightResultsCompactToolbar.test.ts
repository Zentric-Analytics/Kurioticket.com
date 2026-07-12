import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopMinimizedSearchBarSource() {
  const start = source.indexOf("function renderDesktopMinimizedSearchBar()");
  const end = source.indexOf("function renderStickySearchPopoutOverlay()", start);

  assert.notEqual(start, -1, "desktop minimized search bar renderer exists");
  assert.notEqual(end, -1, "sticky popout renderer follows minimized bar");

  return source.slice(start, end);
}

test("desktop sticky compact search is a small four-section toolbar without trip type", () => {
  const toolbar = desktopMinimizedSearchBarSource();

  assert.match(toolbar, /max-w-\[820px\]/);
  assert.match(
    toolbar,
    /grid-cols-\[minmax\(220px,1\.5fr\)_minmax\(150px,0\.9fr\)_minmax\(160px,1fr\)_92px\]/,
  );
  assert.match(toolbar, /h-\[58px\]/);
  assert.match(toolbar, /h-10 w-\[92px\]/);
  assert.match(toolbar, /openStickySearchEditor\("route"\)/);
  assert.match(toolbar, /openStickySearchEditor\("dates"\)/);
  assert.match(toolbar, /openStickySearchEditor\("travelers"\)/);
  assert.doesNotMatch(toolbar, /t\("tripType"\)/);
  assert.doesNotMatch(toolbar, /mobileTripTypeSummary/);
});
