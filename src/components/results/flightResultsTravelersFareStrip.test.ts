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

test("nearby fares stay inside one ten-day request window", () => {
  assert.match(source, /const nearbyFareRangeSize = 10;/);
  assert.match(source, /const nearbyFareVisibleCount = 7;/);
  assert.match(source, /nearbyFares\.slice\(/);
  assert.match(source, /nearbyFareRangeSize - nearbyFareVisibleCount/);
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
  assert.match(source, /displayPrice \?\? "Unavailable"/);
  assert.match(source, /overflow-hidden text-ellipsis whitespace-nowrap/);
});

test("mobile and desktop nearby fares share one truthful fare state and selection handler", () => {
  assert.equal(source.match(/const \[nearbyFares, setNearbyFares\]/g)?.length, 1);
  assert.equal(source.match(/nearbyFareCacheRef = useRef/g)?.length, 1);
  assert.match(source, /data-nearby-fare-presentation="mobile"/);
  assert.match(source, /nearbyFares\.length[\s\S]*\? nearbyFares/);
  assert.match(source, /nearbyFares\.slice\(/);
  assert.ok((source.match(/handleNearbyFareDateSelect\(fare\.date\)/g) ?? []).length >= 2);
});

test("mobile nearby fares scroll horizontally without widening the page", () => {
  const marker = source.indexOf('data-nearby-fare-presentation="mobile"');
  const start = source.lastIndexOf("<div", marker);
  const end = source.indexOf('className="hidden w-full sm:block"', start);
  const mobileStrip = source.slice(start, end);

  assert.match(mobileStrip, /sm:hidden/);
  assert.match(mobileStrip, /min-w-0/);
  assert.match(mobileStrip, /max-w-full/);
  assert.match(mobileStrip, /overflow-hidden/);
  assert.match(mobileStrip, /overflow-x-auto/);
  assert.doesNotMatch(mobileStrip, /touch-pan-x/);
  assert.doesNotMatch(mobileStrip, /overscroll-x-contain/);
  assert.match(mobileStrip, /snap-center/);
  assert.doesNotMatch(mobileStrip, /snap-start/);
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
  assert.doesNotMatch(mobileStrip, /onPointer|onTouch|preventDefault\(\)/);
  assert.match(mobileStrip, /min-h-\[28px\][^"]*text-\[10px\][^"]*font-semibold[^"]*leading-\[14px\][^"]*">Cheaper nearby:/);
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
  assert.doesNotMatch(source.slice(source.indexOf('data-nearby-fare-presentation="mobile"'), source.indexOf('data-desktop-nearby-fare-rail')), />Unavailable</);
});

test("mobile date rail precedes a non-sticky quick-filter rail", () => {
  const dateRail = source.indexOf('data-nearby-fare-presentation="mobile"');
  const shortcuts = source.indexOf("data-flight-mobile-results-shortcuts", dateRail);
  assert.ok(dateRail >= 0 && shortcuts > dateRail);
  const shortcutRegion = source.slice(shortcuts, shortcuts + 900);
  assert.match(shortcutRegion, /-mx-\[14px\] px-0 py-1 sm:hidden/);
  assert.doesNotMatch(shortcutRegion, /bg-\[#F5F7FB\]|bg-white/);
  assert.doesNotMatch(shortcutRegion, /sticky|top-\[calc\(|backdrop-blur/);
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

test("standalone pagination owns local state and mirrors it through native history", () => {
  assert.match(source, /const \[standaloneResultsPage, setStandaloneResultsPage\] = useState\(\(\) =>[\s\S]*?urlParams\.get\("page"\)/);
  assert.match(source, /guidedMode[\s\S]*?guidedResultsPage[\s\S]*?: standaloneResultsPage/);
  assert.match(source, /paginateFlightResults\(sortedResults, validResultsPage\)/);
  const start = source.indexOf("const changeResultsPage");
  const end = source.indexOf("useEffect", start);
  const pagination = source.slice(start, end);
  assert.match(pagination, /setStandaloneResultsPage\(page\)/);
  assert.match(pagination, /page === 1\) nextParams\.delete\("page"\)/);
  assert.match(pagination, /nextParams\.set\("page", String\(page\)\)/);
  assert.match(pagination, /window\.history\.replaceState/);
  assert.doesNotMatch(pagination, /router\.push/);
});

test("nearby fare DOM remains outside the paginated card subtree", () => {
  const rail = source.indexOf('data-nearby-fare-presentation="mobile"');
  const paginatedCards = source.indexOf("ref={paginationListRef}");
  assert.ok(rail > -1 && paginatedCards > rail);
  assert.doesNotMatch(source.slice(rail, paginatedCards), /paginationPendingPage/);
});

test("mobile Cars-style summary hands off to the compact header after scroll", () => {
  assert.doesNotMatch(source, /mobileResultsSearch=|mobileResultsSticky=/);
  assert.match(source, /relative translate-y-1\/2/);
  assert.match(source, /renderMobileRouteSummaryCard\(\)/);
  assert.match(source, /renderMobileCompactResultsHeader/);
  assert.match(source, /mobileCompactHeaderVisible/);
  assert.match(source, /mobileSearchSummarySentinelRef/);
  assert.match(source, /rect\.bottom < 8 && window\.scrollY > 96/);
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
  assert.match(pageChange, /nextParams\.set\("page", String\(page\)\)/);
  assert.doesNotMatch(pageChange, /setDepartureDate|nearbyFareCacheRef|setNearbyFares/);
});

test("desktop nearby-fare window resets for departure-date changes, not pagination", () => {
  const resetMarker = source.indexOf(
    "setNearbyFareVisibleStart(nearbyFareCenteredVisibleStart)",
  );
  const resetEffectStart = source.lastIndexOf("useEffect", resetMarker);
  const resetEffectEnd = source.indexOf("useEffect", resetMarker + 1);
  const resetEffect = source.slice(resetEffectStart, resetEffectEnd);
  assert.match(resetEffect, /body\?\.departureDate/);
  assert.doesNotMatch(resetEffect, /validResultsPage/);
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
