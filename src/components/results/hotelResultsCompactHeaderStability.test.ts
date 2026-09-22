import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Hotel results keeps one mobile navbar instead of replacing it on scroll", () => {
  assert.match(source, /mobileResultsSearch=/);\n  assert.doesNotMatch(source, /mobileResultsLeadingAction=/);
  assert.doesNotMatch(source, /showMobileCompactHotelSearch|mobileSearchSummarySentinelRef/);
  assert.match(source, /placement="top"/);
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
