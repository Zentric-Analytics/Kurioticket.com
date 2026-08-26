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
  assert.match(mobileStrip, /touch-pan-x/);
  assert.match(mobileStrip, /overscroll-x-contain/);
  assert.match(mobileStrip, /scrollbar-width:none/);
  assert.match(mobileStrip, /data-fare-date-cell/);
  assert.match(mobileStrip, /min-h-\[76px\]/);
  assert.match(mobileStrip, /aria-current=\{selected \? "date"/);
  assert.match(mobileStrip, /aria-pressed=\{selected\}/);
  assert.match(mobileStrip, /disabled=\{selected \|\| loading \|\| fare\.status === "loading"\}/);
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
