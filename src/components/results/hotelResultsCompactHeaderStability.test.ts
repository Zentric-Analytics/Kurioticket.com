import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

const compactHeader = source.match(
  /<div\n\s+className=\{cn\(\n\s+"fixed inset-x-0 top-0 z-\[900\][\s\S]*?\n\s+>\n\s+<div className="grid h-14/,
)?.[0];

test("Hotel compact header visibility remains scroll-driven while Edit Search is open", () => {
  assert.ok(compactHeader, "compact Hotel header branch must exist");
  assert.match(
    compactHeader,
    /showMobileCompactHotelSearch\n\s+\? "translate-y-0 opacity-100"/,
  );
  assert.doesNotMatch(
    compactHeader,
    /showMobileCompactHotelSearch\s*&&\s*!mobileHotelSearchOpen/,
  );
  assert.match(compactHeader, /mobileHotelSearchOpen && "pointer-events-none"/);
  assert.match(
    compactHeader,
    /inert=\{mobileHotelSearchOpen \|\| !showMobileCompactHotelSearch\}/,
  );
});

test("opening and closing Hotel Edit Search does not reset scroll visibility", () => {
  const openHandler = source.match(
    /const openMobileHotelSearch = useCallback\([\s\S]*?\n\s+\}, \[\]\);/,
  )?.[0];
  const closeHandler = source.match(
    /const closeMobileHotelSearch = useCallback\([\s\S]*?\n\s+\}, \[\]\);/,
  )?.[0];

  assert.ok(openHandler);
  assert.ok(closeHandler);
  assert.doesNotMatch(openHandler, /setShowMobileCompactHotelSearch/);
  assert.doesNotMatch(closeHandler, /setShowMobileCompactHotelSearch/);
});
