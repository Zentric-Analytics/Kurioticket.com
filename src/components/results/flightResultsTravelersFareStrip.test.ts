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
  assert.match(mobileStrip, /min-h-\[76px\]/);
  assert.match(mobileStrip, /aria-current=\{selected \? "date"/);
  assert.match(mobileStrip, /aria-pressed=\{selected\}/);
  assert.match(mobileStrip, /disabled=\{selected \|\| loading \|\| fare\.status === "loading"\}/);
  assert.doesNotMatch(mobileStrip, /onPointer|onTouch|preventDefault\(\)/);
});

test("mobile nearby fares align once per flight search and preserve selected geometry across result pagination", () => {
  assert.match(source, /mobileNearbyFareRailRef = useRef<HTMLDivElement>/);
  assert.match(source, /mobileSelectedNearbyFareRef = useRef<HTMLButtonElement>/);
  assert.match(source, /alignedMobileNearbyFareSearchRef = useRef<string \| null>/);
  assert.match(source, /mobileNearbyFareScrollLeftRef = useRef\(0\)/);
  assert.match(source, /nearbyFarePaginationSnapshotRef/);

  const alignmentStart = source.indexOf("const alignmentIdentity");
  const paginationStart = source.indexOf("const changeResultsPage", alignmentStart);
  const alignment = source.slice(alignmentStart, paginationStart);
  assert.match(alignment, /buildFlightResultsSearchKey\(body\).*body\.departureDate/);
  assert.doesNotMatch(alignment, /validResultsPage|page=/);
  assert.match(source, /nearbyFares\.length === 0/);
  assert.match(alignment, /selectedCell\?\.isConnected/);
  assert.match(alignment, /rail\.clientWidth > 0/);
  assert.match(alignment, /rail\.scrollWidth > 0/);
  assert.match(alignment, /selectedCell\.offsetWidth > 0/);
  assert.match(alignment, /requestAnimationFrame\(alignSelectedFare\)/);
  assert.match(alignment, /cancelAnimationFrame\(frame\)/);
  assert.match(source, /rail\.getBoundingClientRect\(\)/);
  assert.match(source, /selectedCell\.getBoundingClientRect\(\)/);
  assert.match(source, /selectedRect\.left - railRect\.left \+ rail\.scrollLeft/);
  assert.match(source, /getCenteredRailScrollLeft\(/);
  assert.match(source, /ref=\{mobileNearbyFareRailRef\}/);
  assert.match(source, /ref=\{selected \? mobileSelectedNearbyFareRef : undefined\}/);
  assert.match(source, /rail\.scrollTo\(\{ left: target, behavior: "auto" \}\)/);
  assert.ok(
    alignment.indexOf("rail.scrollTo({ left: target, behavior: \"auto\" })") <
      alignment.indexOf("alignedMobileNearbyFareSearchRef.current = alignmentIdentity"),
  );
  assert.match(alignment, /\[body, nearbyFares\]/);
  assert.doesNotMatch(source, /scrollIntoView\(/);
});

test("results pagination snapshots and restores the selected date's visible offset", () => {
  assert.match(source, /onScroll=\{\(event\) => \{ mobileNearbyFareScrollLeftRef\.current = event\.currentTarget\.scrollLeft; \}\}/);

  const pageChangeStart = source.indexOf("const changeResultsPage");
  const pageChangeEnd = source.indexOf("useEffect", pageChangeStart);
  const pagination = source.slice(pageChangeStart, pageChangeEnd);
  assert.match(pagination, /mobileSelectedNearbyFareRef\.current/);
  assert.match(pagination, /departureDate: body\?\.departureDate/);
  assert.match(pagination, /selectedRect\.left - railRect\.left/);
  assert.match(pagination, /selectedWidth: selectedRect\?\.width/);
  assert.match(pagination, /selectedWasVisible/);
  assert.match(pagination, /isHorizontallyVisibleWithinContainer/);
  assert.match(pagination, /getNearbyFareAnchorCorrection/);
  assert.match(pagination, /rail\.scrollLeft \+ correction/);
  assert.match(pagination, /nearbyFareAnchorTolerancePx/);
  assert.match(pagination, /geometryPasses < 3/);
  assert.match(pagination, /snapshot\.scrollLeft/);
  assert.doesNotMatch(pagination, /getCenteredRailScrollLeft/);
});

test("mobile compact header freezes geometry and sentinel state while Edit Search owns interaction", () => {
  const headerStart = source.indexOf("function renderMobileCompactResultsHeader");
  const headerEnd = source.indexOf("function renderMobile", headerStart + 20);
  const header = source.slice(headerStart, headerEnd > headerStart ? headerEnd : headerStart + 8000);
  assert.match(header, /transition-opacity/);
  assert.doesNotMatch(header, /transition-all|-translate-y-2|translate-y-0/);
  assert.match(header, /mobileCompactHeaderVisible \? "opacity-100" : "opacity-0"/);
  assert.match(header, /mobileCompactHeaderVisible && !mobileSearchOpen[\s\S]*pointer-events-auto[\s\S]*pointer-events-none/);
  assert.match(header, /aria-hidden=\{!mobileCompactHeaderVisible \|\| mobileSearchOpen\}/);

  assert.match(source, /if \(mobileSearchOpenRef\.current\) return/);
  assert.match(source, /mobileSearchOpenRef\.current = true/);
  assert.match(source, /mobileSearchOpenRef\.current = false/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{[\s\S]*mobileCompactHeaderUpdateRef\.current\?\.\(\)/);
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
  const resetMarker = source.indexOf("setNearbyFareVisibleStart(0)");
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
