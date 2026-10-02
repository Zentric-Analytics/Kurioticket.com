import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flight = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const header = readFileSync(
  new URL("../layout/AppHeader.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

test("desktop Flight Results reuses the Hotels header composition", () => {
  assert.match(header, /flightResultsDesktopSticky\?: boolean/);
  assert.match(
    header,
    /hotelResultsDesktopSticky \|\| flightResultsDesktopSticky/,
  );
  assert.match(header, /data-flight-results-nav-search/);
  assert.match(header, /lg:max-w-\[540px\]/);
  assert.match(
    styles,
    /\[data-hotel-results-desktop-header\],\s*\[data-flight-results-desktop-header\],\s*\[data-cars-results-desktop-header\] \{\s*position: sticky;/,
  );

  assert.match(
    flight,
    /<AppHeader[\s\S]*?hotelDesktopBoundary[\s\S]*?flightResultsDesktopSticky/,
  );
  assert.match(
    flight,
    /document\.querySelector<HTMLElement>\("\[data-flight-results-nav-search\]"\)/,
  );
  assert.match(
    flight,
    /createPortal\(renderDesktopHeaderSearchBar\(\), desktopNavSearchTarget\)/,
  );
  assert.doesNotMatch(
    flight,
    /\{renderDesktopMinimizedSearchBar\(\)\}/,
  );
  assert.match(
    flight,
    /sm:block lg:hidden/,
  );
});

test("desktop Flight Results keeps the navbar search target synchronized through loading transitions", () => {
  assert.match(
    flight,
    /const observer = new MutationObserver\(\(\) => \{[\s\S]*?\[data-flight-results-nav-search\][\s\S]*?syncDesktopNavSearchTarget\(\)/,
  );
  assert.match(
    flight,
    /observer\.observe\(document\.body, \{[\s\S]*?childList: true,[\s\S]*?subtree: true/,
  );
  assert.match(
    flight,
    /setDesktopNavSearchTarget\(\(current\) =>[\s\S]*?current === nextTarget \? current : nextTarget/,
  );
  assert.doesNotMatch(
    flight,
    /\}, \[guidedMode, loading\]\);/,
  );

  const editorStart = flight.indexOf("const openStickySearchEditor = useCallback(");
  const editorEnd = flight.indexOf("const isStickySearchPanelOpen", editorStart);
  const editor = flight.slice(editorStart, editorEnd);

  assert.ok(editorStart >= 0 && editorEnd > editorStart);
  assert.match(editor, /tripTypeInput === "multi-city" \? null : target/);
  assert.match(editor, /setIsSearchExpandedWhileSticky\(true\)/);
  assert.doesNotMatch(editor, /searchFormRef\.current\?\.scrollIntoView/);
  assert.match(
    flight,
    /tripTypeInput === "multi-city"[\s\S]*?data-sticky-multicity-editor/,
  );
});


test("desktop Flight Results keeps the header search mounted through preparation", () => {
  const preparingStart = flight.indexOf("if (resultsUiPreparing) {");
  const guidedStart = flight.indexOf("if (guidedMode) return (", preparingStart);
  const preparing = flight.slice(preparingStart, guidedStart);

  assert.ok(preparingStart >= 0 && guidedStart > preparingStart);
  assert.match(preparing, /flightResultsDesktopSticky/);
  assert.match(
    preparing,
    /createPortal\(renderDesktopHeaderSearchBar\(\), desktopNavSearchTarget\)/,
  );
});

test("desktop navbar search opens the Change your flight editor on every click state", () => {
  assert.match(
    flight,
    /const isStickySearchPanelOpen = isSearchExpandedWhileSticky;/,
  );
  assert.doesNotMatch(
    flight,
    /const isStickySearchPanelOpen =\s*isSearchCollapsed && isSearchExpandedWhileSticky/,
  );

  const callbackStart = flight.indexOf("const openStickySearchEditor = useCallback(");
  const callbackEnd = flight.indexOf("const isStickySearchPanelOpen", callbackStart);
  const callback = flight.slice(callbackStart, callbackEnd);

  assert.ok(callbackStart >= 0 && callbackEnd > callbackStart);
  assert.match(callback, /setIsSearchExpandedWhileSticky\(true\)/);
  assert.match(callback, /setActiveDesktopSearchSurface\("sticky"\)/);
});

test("desktop Flight Results puts the Hotels-style summary directly above result cards", () => {
  const nearby = flight.indexOf("data-desktop-nearby-fare-rail");
  const priceAlert = flight.indexOf("data-flight-price-alert-row");
  const summary = flight.indexOf("data-flight-results-desktop-summary");
  const desktopResults = flight.indexOf("ref={paginationListRef}");

  assert.ok(nearby >= 0);
  assert.ok(priceAlert > nearby);
  assert.ok(summary > priceAlert);
  assert.ok(desktopResults > summary);

  const summarySource = flight.slice(summary, desktopResults);
  assert.match(
    summarySource,
    /text-\[12px\] font-normal leading-4 text-\[#191E3B\]/,
  );
  assert.match(summarySource, /hotel-results-sort-trigger/);
  assert.match(
    summarySource,
    /rounded-full border border-\[#9299A9\] bg-white px-3 text-\[#191E3B\]/,
  );
  assert.match(summarySource, /Sort by \{selectedSortLabel\}/);
  assert.doesNotMatch(summarySource, /flight-results-hotel-sort-trigger/);
});