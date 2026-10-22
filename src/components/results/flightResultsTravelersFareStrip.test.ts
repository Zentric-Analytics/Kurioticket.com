import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);


test("mobile nearby fares stay inside one ten-day request window", () => {
  assert.match(source, /const nearbyFareRangeSize = 10;/);
  assert.match(source, /getNearbyFareDateRange\(/);
  assert.match(source, /data-nearby-fare-presentation="mobile"/);
  assert.doesNotMatch(source, /nearbyFareVisibleCount|nearbyFareVisibleStart|nearbyFareCenteredVisibleStart/);
  assert.doesNotMatch(source, /setFareWindowStart/);
});

test("desktop traveler rows use title-case labels and moderate controls", () => {
  const desktopRows = source.slice(
    source.indexOf('label={t("adults")}'),
    source.indexOf("function CounterRow"),
  );
  assert.match(desktopRows, /label={t\("adults"\)}/);
  assert.match(desktopRows, /label={t\("children"\)}/);
  assert.match(desktopRows, /label={t\("infantPlural"\)}/);
  assert.match(desktopRows, /presentation="desktop"/);
  assert.match(source, /presentation === "desktop" \? "h-10 w-10"/);
});

test("long nearby-fare currency values use adaptive sizing without wrapping", () => {
  assert.match(source, /data-price-size=/);
  assert.match(styles, /flight-fare-strip-price\[data-price-size="long"\]/);
  assert.match(
    styles,
    /flight-fare-strip-price\[data-price-size="extra-long"\]/,
  );
  assert.match(styles, /white-space: nowrap/);
  assert.match(styles, /max-width: 100%/);
  assert.match(
    source,
    /const visibleFare = displayPrice \?\? \(fare\.status === "loading" \? "•••" : fare\.status === "unavailable" \? "No fare"/,
  );
  assert.match(source, /overflow-hidden text-ellipsis whitespace-nowrap/);
});


test("desktop nearby fare calendar and cheaper-nearby insight are removed without changing mobile", () => {
  assert.doesNotMatch(source, /data-desktop-nearby-fare-rail/);
  assert.doesNotMatch(source, /data-desktop-cheaper-nearby/);
  assert.doesNotMatch(source, /desktop-flight-fare-price|desktop-flight-cheaper-nearby/);
  assert.doesNotMatch(styles, /data-desktop-nearby-fare-rail|desktop-flight-fare-price|desktop-flight-cheaper-nearby/);
  assert.match(source, /data-nearby-fare-presentation="mobile"/);
  assert.match(source, /flight-mobile-cheaper-nearby/);
});


test("nearby fare provider requests run only on mobile viewports and react to breakpoint changes", () => {
  assert.match(
    source,
    /const \[mobileNearbyFaresEnabled, setMobileNearbyFaresEnabled\] = useState\([\s\S]*?matchMedia\("\(max-width: 639px\)"\)\.matches/,
  );
  assert.match(
    source,
    /const mediaQuery = window\.matchMedia\("\(max-width: 639px\)"\);[\s\S]*?mediaQuery\.addEventListener\("change", handleChange\)[\s\S]*?mediaQuery\.removeEventListener\("change", handleChange\)/,
  );
  assert.match(
    source,
    /if \(!mobileNearbyFaresEnabled\) \{[\s\S]*?setNearbyFares\(\[\]\)[\s\S]*?return \(\) => window\.clearTimeout\(timer\);/,
  );
  const nearbyEffectStart = source.indexOf(
    "const generation = nearbyFareGenerationRef.current + 1",
  );
  const nearbyEffectEnd = source.indexOf(
    "useEffect(() => {\n    if (!tripTypeMenuOpen)",
    nearbyEffectStart,
  );
  const nearbyEffect = source.slice(nearbyEffectStart, nearbyEffectEnd);
  assert.match(nearbyEffect, /fetch\("\/api\/flights\/search"/);
  assert.match(nearbyEffect, /mobileNearbyFaresEnabled/);
});

test("mobile nearby fares keep one truthful fare state and selection handler", () => {
  assert.equal(source.match(/const \[nearbyFares, setNearbyFares\]/g)?.length, 1);
  assert.equal(source.match(/nearbyFareCacheRef = useRef/g)?.length, 1);
  assert.match(source, /data-nearby-fare-presentation="mobile"/);
  assert.match(source, /nearbyFares\.length[\s\S]*\? nearbyFares/);
  assert.ok((source.match(/handleNearbyFareDateSelect\(fare\.date\)/g) ?? []).length >= 1);
  assert.match(source, /handleNearbyFareDateSelect\(cheaperNearbyFare\.date\)/);
  assert.doesNotMatch(source, /data-desktop-nearby-fare-rail|data-desktop-cheaper-nearby/);
});

test("mobile nearby fares scroll horizontally without widening the page", () => {
  const marker = source.indexOf('data-nearby-fare-presentation="mobile"');
  const start = source.lastIndexOf("<div", marker);
  const end = source.indexOf("{mobileFlightPriceAlertQuery", start);
  const mobileStrip = source.slice(start, end);

  assert.match(mobileStrip, /sm:hidden/);
  assert.match(mobileStrip, /min-w-0/);
  assert.match(mobileStrip, /max-w-full/);
  assert.match(mobileStrip, /overflow-hidden/);
  assert.match(mobileStrip, /ref=\{mobileNearbyFareRailRef\} className="[^"]*overflow-x-auto[^"]*overscroll-x-contain/);
  assert.doesNotMatch(mobileStrip, /mobileNearbyFareAxisLockRef|touch-pan-x|touch-pan-y/);
  assert.match(mobileStrip, /overflow-x-auto/);
  assert.match(mobileStrip, /overscroll-x-contain/);
  assert.match(mobileStrip, /-webkit-overflow-scrolling:touch/);
  assert.doesNotMatch(mobileStrip, /snap-x|snap-proximity|snap-center|snap-start/);
  assert.match(mobileStrip, /px-3/);
  assert.match(mobileStrip, /scroll-padding-inline:0\.75rem/);
  assert.match(mobileStrip, /scrollbar-width:none/);
  assert.match(mobileStrip, /data-fare-date-cell/);
  assert.match(mobileStrip, /h-\[80px\]/);
  assert.match(mobileStrip, /py-\[5px\]/);
  assert.match(mobileStrip, /h-\[70px\]/);
  assert.match(mobileStrip, /w-\[clamp\(76px,calc\(27\.4vw_-_11\.8px\),96px\)\]/);
  assert.match(mobileStrip, /rounded-lg/);
  assert.match(mobileStrip, /px-1\.5 py-2/);
  assert.match(mobileStrip, /text-\[11px\] font-bold uppercase leading-\[14px\]/);
  assert.match(mobileStrip, /text-\[10px\] font-semibold uppercase leading-\[13px\]/);
  assert.match(mobileStrip, /aria-current=\{selected \? "date"/);
  assert.match(mobileStrip, /aria-pressed=\{selected\}/);
  assert.match(mobileStrip, /disabled=\{selected \|\| loading \|\| fare\.status === "loading"\}/);
  assert.doesNotMatch(mobileStrip, /onTouch|preventDefault\(\)/);
  assert.doesNotMatch(source, /useHorizontalRailAxisLockRef/);
  const nearbyInsight = mobileStrip.match(/className="([^"]*)">Cheaper nearby:/)?.[1] ?? "";
  assert.match(nearbyInsight, /min-h-\[28px\]/);
  assert.match(nearbyInsight, /flight-mobile-cheaper-nearby/);
  assert.match(nearbyInsight, /font-medium/);
  assert.doesNotMatch(nearbyInsight, /text-\[\d+px\]|leading-\[\d+px\]/);
  assert.match(
    styles,
    /@media \(max-width: 639px\) \{[\s\S]*?\.flight-mobile-cheaper-nearby \{[\s\S]*?font-size: 11px !important;[\s\S]*?line-height: 15px !important;[\s\S]*?-webkit-text-size-adjust: none;[\s\S]*?text-size-adjust: none;[\s\S]*?\}/,
  );
  assert.match(mobileStrip, /onClick=\{\(\) => handleNearbyFareDateSelect\(cheaperNearbyFare\.date\)\}/);
});

test("mobile nearby fares use native-scale price typography with adaptive fitting", () => {
  assert.match(styles, /\[data-nearby-fare-presentation="mobile"\] \.flight-fare-strip-price \{[\s\S]*?font-size: 0\.6875rem;[\s\S]*?line-height: 0\.875rem;[\s\S]*?font-weight: 600;/);
  assert.match(styles, /\[data-nearby-fare-presentation="mobile"\] \.flight-fare-strip-price\[data-price-size="long"\] \{[\s\S]*?font-size: 0\.625rem;/);
  assert.match(styles, /\[data-nearby-fare-presentation="mobile"\] \.flight-fare-strip-price\[data-price-size="extra-long"\] \{[\s\S]*?font-size: 0\.5625rem;/);
  assert.match(source, /data-price-size=\{visibleFare\.replace/);
});

test("mobile nearby fare states match native terminology", () => {
  for (const state of ["•••", "No fare", "Try later", "—"]) assert.match(source, new RegExp(state));
  assert.match(source, /Fare loading/);
  assert.match(source, /Fare unavailable/);
  assert.match(source, /Fare could not be checked/);
  assert.match(source, /Fare not checked/);
  const mobileStart = source.indexOf('data-nearby-fare-presentation="mobile"');
  const mobileEnd = source.indexOf("{mobileFlightPriceAlertQuery", mobileStart);
  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart);
  assert.doesNotMatch(source.slice(mobileStart, mobileEnd), />Unavailable</);
});

test("mobile quick filters portal into the header before the date rail", () => {
  const shortcuts = source.indexOf("data-flight-mobile-results-shortcuts");
  const dateRail = source.indexOf('data-nearby-fare-presentation="mobile"');
  assert.ok(shortcuts >= 0 && shortcuts < dateRail);
  const shortcutRegion = source.slice(shortcuts, source.indexOf("</section>", shortcuts));
  assert.match(shortcutRegion, /w-full py-2 sm:hidden/);
  assert.match(source, /mobileNavFiltersTarget[\s\S]*createPortal\(mobileResultsFiltersContent, mobileNavFiltersTarget\)/);
  assert.doesNotMatch(source, /data-flight-mobile-filter-slot|flight-mobile-scroll-filter-bar/);
  assert.doesNotMatch(source, /data-scroll-visible|data-scroll-pinned|mobileFilterRailPinned|mobileFilterRailVisible/);
});

test("responsive mobile sizing shows three complete dates and a fourth-date peek", () => {
  for (const viewport of [360, 390, 412]) {
    const railContentWidth = viewport - 32 - 24;
    const cardWidth = Math.min(96, Math.max(76, viewport * 0.274 - 11.8));
    const threeCardsWidth = cardWidth * 3 + 8 * 2;
    const fourCardsWidth = cardWidth * 4 + 8 * 3;

    assert.ok(threeCardsWidth <= railContentWidth, `${viewport}px fits three cards`);
    assert.ok(fourCardsWidth > railContentWidth, `${viewport}px keeps the fourth partial`);
    assert.ok(railContentWidth - (threeCardsWidth + 8) > 0, `${viewport}px exposes a fourth-card peek`);
  }
});

test("mobile nearby fares align per search and recover visibility after layout or page resume", () => {
  assert.match(source, /mobileNearbyFareRailRef = useRef<HTMLDivElement>/);
  assert.match(source, /mobileSelectedNearbyFareRef = useRef<HTMLButtonElement>/);
  assert.match(source, /alignedMobileNearbyFareSearchRef = useRef<string \| null>/);
  assert.doesNotMatch(source, /mobileNearbyFareScrollLeftRef/);
  assert.doesNotMatch(source, /nearbyFarePaginationSnapshotRef/);

  const alignmentStart = source.indexOf("const alignmentIdentity");
  const paginationStart = source.indexOf("const changeResultsPage", alignmentStart);
  const alignment = source.slice(alignmentStart, paginationStart);
  assert.match(alignment, /buildFlightResultsSearchKey\(body\).*body\.departureDate/);
  assert.doesNotMatch(alignment, /validResultsPage|page=/);
  assert.match(source, /nearbyFares\.length === 0/);
  assert.match(alignment, /selectedCell\?\.isConnected/);
  assert.match(alignment, /rail\.clientWidth <= 0/);
  assert.match(alignment, /rail\.scrollWidth <= 0/);
  assert.match(alignment, /selectedCell\.offsetWidth <= 0/);
  assert.match(alignment, /requestAnimationFrame\(attemptAlignment\)/);
  assert.match(alignment, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /rail\.getBoundingClientRect\(\)/);
  assert.match(source, /selectedCell\.getBoundingClientRect\(\)/);
  assert.match(source, /selectedRect\.left - railRect\.left \+ rail\.scrollLeft/);
  assert.match(source, /getCenteredRailScrollLeft\(/);
  assert.match(source, /ref=\{mobileNearbyFareRailRef\}/);
  assert.match(source, /ref=\{selected \? mobileSelectedNearbyFareRef : undefined\}/);
  assert.match(source, /rail\.scrollTo\(\{[\s\S]*getCenteredRailScrollLeft/);
  assert.match(
    alignment,
    /rail\.scrollTo\(\{[\s\S]*?alignedMobileNearbyFareSearchRef\.current = alignmentIdentity/,
  );
  assert.match(alignment, /new ResizeObserver\(refreshAlignment\)/);
  assert.match(alignment, /window\.addEventListener\("pageshow", refreshAlignment\)/);
  assert.match(alignment, /document\.addEventListener\("visibilitychange", handleVisibilityChange\)/);
  assert.match(alignment, /alignSelectedMobileFare\(true\)/);
  assert.doesNotMatch(source, /scrollIntoView\(/);
});

test("results pagination is calendar-blind", () => {
  const pageChangeStart = source.indexOf("const changeResultsPage");
  const pageChangeEnd = source.indexOf("useEffect", pageChangeStart);
  const pagination = source.slice(pageChangeStart, pageChangeEnd);
  for (const forbidden of [
    "mobileNearbyFareRailRef",
    "mobileSelectedNearbyFareRef",
    "nearbyFare",
    "departureDate",
    "scrollLeft",
    "getCenteredRailScrollLeft",
    "getNearbyFareAnchorCorrection",
  ]) assert.doesNotMatch(pagination, new RegExp(forbidden));
  assert.doesNotMatch(source, /getNearbyFareAnchorCorrection|NearbyFarePaginationSnapshot/);
});

test("continuous results do not use URL page state to limit inventory", () => {
  assert.doesNotMatch(source, /standaloneResultsPage|guidedResultsPage|paginateFlightResults|changeResultsPage/);
  assert.match(source, /sortedResults\.map/);
});

test("nearby fare DOM remains outside the paginated card subtree", () => {
  const rail = source.indexOf('data-nearby-fare-presentation="mobile"');
  const paginatedCards = source.indexOf("data-mobile-continuous-flight-results");
  assert.ok(rail > -1 && paginatedCards > rail);
  assert.doesNotMatch(source.slice(rail, paginatedCards), /<FlightResultsPagination/);
});

test("mobile search stays in AppHeader without a scroll handoff", () => {
  assert.match(source, /mobileResultsSearch=\{renderMobileRouteSummaryCard\(\)\}/);
  assert.doesNotMatch(source, /renderMobileCompactResultsHeader|mobileCompactHeaderVisible|mobileSearchSummarySentinelRef/);
});

test("results pagination preserves the searched departure date and its blue selected state", () => {
  assert.match(source, /const selected = fare\.date === body\?\.departureDate/);
  assert.match(source, /aria-current=\{selected \? "date" : undefined\}/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /selected && "border-\[#075EE8\] bg-blue-50\/60"/);
  assert.match(source, /selected \? <span className="absolute[^\"]*bg-\[#075EE8\]"/);

  const pageChangeStart = source.indexOf("const changeResultsPage");
  const pageChangeEnd = source.indexOf("useEffect", pageChangeStart);
  const pageChange = source.slice(pageChangeStart, pageChangeEnd);
  assert.doesNotMatch(source, /nextParams\.set\("page", String\(page\)\)/);
  assert.doesNotMatch(pageChange, /setDepartureDate|nearbyFareCacheRef|setNearbyFares/);
});


test("desktop nearby-fare window state is removed", () => {
  assert.doesNotMatch(source, /nearbyFareVisibleStart/);
  assert.doesNotMatch(source, /setNearbyFareVisibleStart/);
  assert.doesNotMatch(source, /navigateNearbyFareWindow/);
  assert.doesNotMatch(source, /nearbyFareVisibleCount/);
  assert.doesNotMatch(source, /nearbyFareCenteredVisibleStart/);
});

test("nearby fares remain excluded from multi-city searches", () => {
  assert.match(source, /body\?\.tripType !== "multi-city" \? \(/);
});

test("nearby selection preserves round-trip duration", () => {
  const start = source.indexOf("const handleNearbyFareDateSelect");
  const end = source.indexOf("const stopOptions", start);
  const selection = source.slice(start, end);
  assert.match(selection, /tripType"\) === "round-trip"/);
  assert.match(selection, /preserveRoundTripDuration\(/);
  assert.match(selection, /nextParams\.set\("returnDate", adjustedReturnDate\)/);
});
