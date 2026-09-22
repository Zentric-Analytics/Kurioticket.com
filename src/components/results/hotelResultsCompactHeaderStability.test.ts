import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);

test("Hotel results keeps the page navbar and Cars-style floating plus compact mobile search chrome", () => {
  assert.doesNotMatch(source, /mobileResultsSearch=/);
  assert.doesNotMatch(source, /mobileResultsLeadingAction=/);
  assert.match(source, /mobileSearchSummarySentinelRef/);
  assert.match(source, /setMobileCompactHeaderVisible/);
  assert.match(source, /h-\[4\.25rem\][\s\S]*max-w-\[30rem\]/);
  assert.match(source, /relative translate-y-1\/2/);
  assert.match(source, /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/);
  assert.match(source, /data-hotels-compact-edit-icon/);
  assert.doesNotMatch(source, /placement="top"/);
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
