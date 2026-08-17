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
  assert.match(toolbar, /top-0/);
  assert.match(toolbar, /rounded-lg/);
  assert.match(toolbar, /onClick={openStickySearchEditor}/);
  assert.doesNotMatch(toolbar, /openStickySearchEditor\("route"\)/);
  assert.doesNotMatch(toolbar, /openStickySearchEditor\("dates"\)/);
  assert.doesNotMatch(toolbar, /openStickySearchEditor\("travelers"\)/);
  assert.doesNotMatch(toolbar, /t\("tripType"\)/);
  assert.doesNotMatch(toolbar, /mobileTripTypeSummary/);
  assert.equal(toolbar.match(/text-slate-500/g)?.length, 3);
  assert.doesNotMatch(toolbar, /text-\[#004BB8\]/);
});


function stickyEditorCallbackSource() {
  const start = source.indexOf("const openStickySearchEditor = useCallback(");
  const end = source.indexOf("const isStickySearchPanelOpen", start);

  assert.notEqual(start, -1, "sticky editor callback exists");
  assert.notEqual(end, -1, "sticky panel open state follows editor callback");

  return source.slice(start, end);
}

test("desktop sticky compact search opens the popout neutrally without targeting fields", () => {
  const callback = stickyEditorCallbackSource();

  assert.match(callback, /setActiveDatePicker\(null\)/);
  assert.match(callback, /setTravelerPopoverOpen\(false\)/);
  assert.match(callback, /setActiveSuggest\(null\)/);
  assert.match(callback, /stickySearchLauncherRef\.current = event\.currentTarget/);
  assert.doesNotMatch(callback, /target ===/);
  assert.doesNotMatch(callback, /\.focus\(\)/);
});

test("sticky search popout uses neutral dialog focus and returns focus to trigger", () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /stickySearchCloseButtonRef\.current\?\.focus\(\)/);
  assert.match(source, /stickySearchLauncherRef\.current\?\.focus\(\)/);
});

test("sticky search popout uses neutral field icons and keeps the calendar controls in view", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchPopovers", start);
  const popout = source.slice(start, end);

  assert.equal(popout.match(/<MapPin aria-hidden="true"/g)?.length, 2);
  assert.match(popout, /<Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/);
  assert.match(popout, /<UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500"/);
  assert.match(popout, /text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800/);
  assert.doesNotMatch(popout, /text-\[#5CB6B2\]|text-\[#39948F\]/);
  assert.match(popout, /pb-8 pt-12 xl:pt-16/);
});
