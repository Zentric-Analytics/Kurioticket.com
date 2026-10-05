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
  assert.match(header, /data-flight-results-nav-search[^\n]*lg:max-w-\[820px\]/);
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
    /document\.querySelector<HTMLElement>\(\s*"\[data-flight-results-nav-search\]"\s*,?\s*\)/,
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
  assert.match(editor, /const resolvedTarget =[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?\? "trip"[\s\S]*?: target/);
  assert.match(editor, /resolvedTarget === "trip" \? null : resolvedTarget/);
  assert.match(editor, /setActiveStickySearchTarget\(resolvedTarget\)/);
  assert.match(editor, /setIsSearchExpandedWhileSticky\(true\)/);
  assert.doesNotMatch(editor, /searchFormRef\.current\?\.scrollIntoView/);
  assert.match(
    flight,
    /tripTypeInput === "multi-city"[\s\S]*?data-sticky-multicity-editor/,
  );
});


test("desktop Flight Results hides navbar search while results are preparing", () => {
  const shellStart = flight.indexOf("const standaloneResultsHeader = guidedMode ? null : (");
  const readySearchStart = flight.indexOf("const readyDesktopNavbarSearch =", shellStart);
  const preparingStart = flight.indexOf("if (resultsUiPreparing) {", readySearchStart);
  const headerShell = flight.slice(shellStart, readySearchStart);
  const readySearchDefinition = flight.slice(readySearchStart, preparingStart);
  const guidedStart = flight.indexOf("if (guidedMode) return (", preparingStart);
  const preparing = flight.slice(preparingStart, guidedStart);
  const readyStart = flight.indexOf("return (", guidedStart);
  const ready = flight.slice(readyStart);

  assert.ok(
    shellStart >= 0 &&
      readySearchStart > shellStart &&
      preparingStart > readySearchStart &&
      guidedStart > preparingStart,
  );
  assert.match(headerShell, /<AppHeader[\s\S]*?flightResultsDesktopSticky/);
  assert.doesNotMatch(headerShell, /renderDesktopHeaderSearchBar\(\)/);
  assert.match(readySearchDefinition, /createPortal\(renderDesktopHeaderSearchBar\(\), desktopNavSearchTarget\)/);
  assert.match(preparing, /\{standaloneResultsHeader\}/);
  assert.doesNotMatch(preparing, /readyDesktopNavbarSearch|renderStickySearchPopoutOverlay\(\)|renderDesktopHeaderSearchBar\(\)/);
  assert.match(ready, /\{standaloneResultsHeader\}[\s\S]*?\{readyDesktopNavbarSearch\}/);
});

test("desktop Flight closes an open sticky search when preparation starts", () => {
  const effectStart = flight.indexOf(
    "if (!resultsUiPreparing || !isStickySearchPanelOpen) return;",
  );
  const effectEnd = flight.indexOf(
    "if (",
    effectStart + 20,
  );
  const effect = flight.slice(effectStart, effectEnd);

  assert.ok(effectStart >= 0);
  assert.match(effect, /pendingStickySearchTargetRef\.current = null/);
  assert.match(effect, /collapseStickySearch\(\{ restoreScroll: false \}\)/);
});

test("desktop navbar search opens only the selected Flight header field editor", () => {
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
  assert.match(callback, /setActiveStickySearchTarget\(resolvedTarget\)/);
  assert.match(callback, /setActiveDesktopSearchSurface\("sticky"\)/);
});

test("desktop Multi-city keeps the Hotels-style sticky header visible while its editor is open", () => {
  assert.match(
    flight,
    /stickySearchPanelOpenRef\.current = true;[\s\S]*setIsSearchExpandedWhileSticky\(true\)/,
  );
  assert.doesNotMatch(
    flight,
    /document\.documentElement\.style\.overflow = "hidden"|lockDocumentScrollWithoutLayoutShift|shouldLockForMultiCity/,
  );
});

test("desktop Flight Results renders one continuous desktop list without range text or pagination", () => {
  const summary = flight.indexOf("data-flight-results-desktop-summary");
  const desktopResults = flight.indexOf("ref={paginationListRef}", summary);
  const desktopResultsEnd = flight.indexOf("</section>", desktopResults);
  const summarySource = flight.slice(summary, desktopResults);
  const desktopSource = flight.slice(desktopResults, desktopResultsEnd);

  assert.ok(summary >= 0 && desktopResults > summary);
  assert.doesNotMatch(summarySource, /resultsDisplayRange\.start|resultsDisplayRange\.end|Showing results/);
  assert.match(desktopSource, /sortedResults\.map\(\(flight, index\) =>/);
  assert.doesNotMatch(desktopSource, /<FlightResultsPagination/);
  assert.match(desktopSource, /aria-busy=\{filterApplying\}/);
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
    /text-\[12px\] font-semibold leading-4 text-\[#191E3B\]/,
  );
  assert.match(summarySource, /hotel-results-sort-trigger/);
  assert.match(
    summarySource,
    /rounded-full border border-\[#9299A9\] bg-white px-3 text-\[#191E3B\]/,
  );
  assert.match(summarySource, /Sort by \{selectedSortLabel\}/);
  assert.doesNotMatch(summarySource, /flight-results-hotel-sort-trigger/);
});