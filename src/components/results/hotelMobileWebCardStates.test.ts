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
  assert.match(card, /data-hotel-card-mobile-grid[\s\S]*?grid-cols-\[38%_minmax\(0,1fr\)\]/);
  assert.match(card, /sizes="\(min-width: 1024px\) 252px, \(min-width: 768px\) 40vw, 38vw"/);
});

test("mobile Hotel cards remain directly openable while utilities stay independent", () => {
  assert.match(
    card,
    /<Link[\s\S]*?aria-hidden="true"[\s\S]*?tabIndex=\{-1\}[\s\S]*?absolute inset-0 z-10 cursor-pointer/,
  );
  assert.match(card, /renderSaveButton[\s\S]*?z-20/);
  assert.match(card, /renderShareButton[\s\S]*?z-20/);
  assert.match(card, /Previous photo[\s\S]*?z-30/);
  assert.match(card, /Next photo[\s\S]*?z-30/);
  assert.match(card, /<LinkButton[\s\S]*?href=\{resolvedDetailsHref\}[\s\S]*?relative z-20 h-9 min-h-9/);
});

test("mobile Hotel cards keep supporting content compact without hiding truthful state", () => {
  assert.match(card, /const collapsedAmenityItems = expandedAmenityItems\.slice\(0, 4\)/);
  assert.match(card, /data-hotel-provider-label[\s\S]*?sm:hidden/);
  assert.match(card, /<p className="[^"\n]*sm:hidden">\s*<span>Source:/);
  assert.match(card, /whitespace-nowrap text-\[18px\][\s\S]*?sm:text-xl/);
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
  const filteredEmpty = results.slice(results.indexOf(") : showFilteredEmptyState ? ("), results.indexOf("noStaysMatchFiltersBody") + 500);
  assert.match(filteredEmpty, /rounded-\[13px\][\s\S]*?noStaysMatchFiltersTitle[\s\S]*?min-h-11 w-full sm:w-auto[\s\S]*?onClick=\{resetFilters\}/);
  assert.match(results, /<div className="rounded-\[13px\][^"\n]*">\s*<p>[^\n]*noStaysMatchFiltersInline/);
});

test("Hotel pagination keeps shared paging semantics without an artificial half-second hold", () => {
  assert.match(results, /PAGINATION_MIN_BUSY_MS/);
  assert.doesNotMatch(results, /setTimeout\(resolve, 520\)/);
  assert.match(results, /aria-label="Hotel results pages"[\s\S]*?pt-2 sm:gap-1\.5 sm:pt-4/);
  assert.match(results, /buildHotelResultsPaginationItems\(currentResultsPage, totalHotelResultPages, true\)/);
});
