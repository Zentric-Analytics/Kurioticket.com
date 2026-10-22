import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Hotel results uses one sticky navbar search at every scroll position", () => {
  assert.doesNotMatch(source, /mobileResultsSearch=/);
  assert.doesNotMatch(source, /mobileResultsLeadingAction=/);
  assert.match(source, /data-hotel-results-mobile-nav-search-button/);
  assert.match(source, /createPortal\(renderMobileHotelNavSearch\(\), mobileNavSearchTarget\)/);
  assert.match(source, /onClick=\{openMobileHotelSearch\}/);
  assert.doesNotMatch(source, /data-hotel-mobile-search-summary|data-hotel-mobile-compact-results-header/);
});

test("opening and closing Hotel Edit Search preserves its existing sheet behavior", () => {
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
