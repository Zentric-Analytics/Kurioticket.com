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
    /\[data-hotel-results-desktop-header\],\s*\[data-flight-results-desktop-header\] \{\s*position: sticky;/,
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

test("desktop Flight Results restores the navbar target after loading and keeps multi-city editable", () => {
  assert.match(
    flight,
    /document\.querySelector<HTMLElement>\("\[data-flight-results-nav-search\]"\)[\s\S]*?\}, \[guidedMode, loading\]\);/,
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

test("desktop Flight Results puts the Hotels-style summary before nearby fares", () => {
  const summary = flight.indexOf("data-flight-results-desktop-summary");
  const nearby = flight.indexOf("data-desktop-nearby-fare-rail");

  assert.ok(summary >= 0);
  assert.ok(nearby > summary);
  assert.match(
    flight.slice(summary, nearby),
    /text-\[12px\] font-normal leading-4 text-\[#191E3B\]/,
  );
  assert.match(
    flight.slice(summary, nearby),
    /flight-results-hotel-sort-trigger/,
  );
  assert.match(
    flight.slice(summary, nearby),
    /rounded-full border border-\[#9299A9\]/,
  );
  assert.match(
    flight.slice(summary, nearby),
    /Sort by \{selectedSortLabel\}/,
  );
  assert.match(
    flight.slice(summary, nearby),
    /role="listbox"/,
  );
});
