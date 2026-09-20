import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);
const skeletons = readFileSync(
  new URL("../ui/Skeleton.tsx", import.meta.url),
  "utf8",
);

test("mobile web Hotel cards fit the results gutter without the old width overflow", () => {
  assert.match(card, /relative mx-auto w-full max-w-\[800px\]/);
  assert.doesNotMatch(card, /w-\[calc\(100%\+0\.5rem\)\]/);
  assert.match(card, /grid min-h-\[244px\] grid-cols-\[39%_minmax\(0,1fr\)\]/);
  assert.match(card, /sizes="\(min-width: 768px\) 320px, 39vw"/);
});

test("mobile Hotel cards remain directly openable while utilities stay independent", () => {
  assert.match(card, /<Link[\s\S]*?absolute inset-0 z-10 sm:hidden/);
  assert.match(card, /renderSaveButton[\s\S]*?z-20/);
  assert.match(card, /renderShareButton[\s\S]*?z-20/);
  assert.match(card, /Previous photo[\s\S]*?z-30/);
  assert.match(card, /Next photo[\s\S]*?z-30/);
  assert.match(card, /relative z-20 inline-flex min-h-9[\s\S]*?sm:hidden/);
});

test("mobile Hotel cards keep supporting content compact without hiding truthful state", () => {
  assert.match(card, /const mobileAmenityItems = expandedAmenityItems\.slice\(0, 3\)/);
  assert.match(card, /data-hotel-provider-label[\s\S]*?sm:hidden/);
  assert.match(card, /Source:[\s\S]*?sm:hidden/);
  assert.match(card, /break-words text-\[17px\][\s\S]*?min-\[390px\]:text-lg/);
  assert.match(card, /<span className="sm:hidden">No live rate<\/span>/);
});

test("Hotel loading skeleton follows the mobile card geometry while desktop retains its own shell", () => {
  assert.match(skeletons, /data-hotel-card-skeleton-mobile[\s\S]*?sm:hidden/);
  assert.match(skeletons, /grid min-h-\[244px\] grid-cols-\[39%_minmax\(0,1fr\)\]/);
  assert.match(skeletons, /data-hotel-card-skeleton-desktop[\s\S]*?hidden[\s\S]*?sm:block/);
  assert.match(skeletons, /grid min-h-\[260px\] grid-cols-\[41%_minmax\(0,1fr\)\]/);
});

test("Hotel empty and error states are phone-sized and recoverable", () => {
  assert.match(results, /error && results\.length === 0[\s\S]*?rounded-\[13px\][\s\S]*?retryGuidedHotelSearch/);
  assert.match(results, /noStaysMatchFiltersTitle[\s\S]*?rounded-\[13px\][\s\S]*?min-h-11 w-full sm:w-auto/);
  assert.match(results, /noStaysMatchFiltersInline[\s\S]*?rounded-\[13px\]/);
});

test("Hotel pagination keeps shared paging semantics without an artificial half-second hold", () => {
  assert.match(results, /PAGINATION_MIN_BUSY_MS/);
  assert.doesNotMatch(results, /setTimeout\(resolve, 520\)/);
  assert.match(results, /aria-label="Hotel results pages"[\s\S]*?pt-2 sm:gap-1\.5 sm:pt-4/);
  assert.match(results, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages, true\)/);
});
