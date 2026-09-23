import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Hotel results uses one native sticky search summary without a scroll-driven duplicate", () => {
  assert.doesNotMatch(source, /mobileResultsSearch=/);
  assert.doesNotMatch(source, /mobileResultsLeadingAction=/);
  assert.match(source, /data-hotel-mobile-sticky-search/);
  assert.match(source, /sticky top-0 z-40 bg-white/);
  assert.doesNotMatch(source, /mobileCompactHeaderVisible|renderMobileCompactResultsHeader|mobileSearchSummarySentinelRef/);
  assert.match(source, /ref=\{mobileResultsTopRef\}/);
});

test("opening and closing Hotel Edit Search does not reset scroll visibility", () => {
  const openHandler = source.match(
    /const openMobileHotelSearch = useCallback\([\s\S]*?\n\s+\}, \[\]\);/,
  )?.[0];
  const closeStart = source.indexOf("const closeMobileHotelSearch = useCallback");
  const closeEnd = source.indexOf("useEffect(() =>", closeStart);
  const closeHandler = source.slice(closeStart, closeEnd);

  assert.ok(openHandler);
  assert.ok(closeStart >= 0 && closeEnd > closeStart);
  assert.doesNotMatch(openHandler, /setShowMobileCompactHotelSearch/);
  assert.doesNotMatch(closeHandler, /setShowMobileCompactHotelSearch/);
  assert.match(closeHandler, /prefers-reduced-motion: reduce/);
  assert.match(closeHandler, /setMobileHotelSearchClosing\(true\)/);
});
