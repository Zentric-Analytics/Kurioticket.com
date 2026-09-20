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
  assert.match(card, /relative mx-auto w-full max-w-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[800px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.doesNotMatch(card, /w-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[calc<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(100%<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden+0<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5rem<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(card, /grid min-h-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[244px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden] grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[39%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(card, /sizes="<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(min-width: 768px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden) 320px, 39vw"/);
});

test("mobile Hotel cards remain directly openable while utilities stay independent", () => {
  assert.match(card, /<Link[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?absolute inset-0 z-10 sm:hidden/);
  assert.match(card, /renderSaveButton[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-20/);
  assert.match(card, /renderShareButton[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-20/);
  assert.match(card, /Previous photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-30/);
  assert.match(card, /Next photo[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?z-30/);
  assert.match(card, /relative z-20 inline-flex min-h-9[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
});

test("mobile Hotel cards keep supporting content compact without hiding truthful state", () => {
  assert.match(card, /const mobileAmenityItems = expandedAmenityItems<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.slice<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0, 3<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)/);
  assert.match(card, /data-hotel-provider-label[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(card, /Source:[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(card, /break-words text-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[17px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?min-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[390px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]:text-lg/);
  assert.match(card, /<span className="sm:hidden">No live rate<<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden/span>/);
});

test("Hotel loading skeleton follows the mobile card geometry while desktop retains its own shell", () => {
  assert.match(skeletons, /data-hotel-card-skeleton-mobile[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:hidden/);
  assert.match(skeletons, /grid min-h-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[244px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden] grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[39%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
  assert.match(skeletons, /data-hotel-card-skeleton-desktop[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?hidden[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?sm:block/);
  assert.match(skeletons, /grid min-h-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[260px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden] grid-cols-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[41%_minmax<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(0,1fr<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
});

test("Hotel empty and error states are phone-sized and recoverable", () => {
  assert.match(results, /error && results<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.length === 0[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?rounded-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[13px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?retryGuidedHotelSearch/);
  assert.match(results, /noStaysMatchFiltersTitle[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?rounded-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[13px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden][<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?min-h-11 w-full sm:w-auto/);
  assert.match(results, /noStaysMatchFiltersInline[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?rounded-<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden[13px<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden]/);
});

test("Hotel pagination keeps shared paging semantics without an artificial half-second hold", () => {
  assert.match(results, /PAGINATION_MIN_BUSY_MS/);
  assert.doesNotMatch(results, /setTimeout<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(resolve, 520<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)/);
  assert.match(results, /aria-label="Hotel results pages"[<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddens<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hiddenS]*?pt-2 sm:gap-1<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden.5 sm:pt-4/);
  assert.match(results, /buildHotelResultsPaginationItems<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden(currentResultsPage, totalHotelResultPages, true<Link[\\s\\S]*?aria-hidden="true"[\\s\\S]*?tabIndex=\\{-1\\}[\\s\\S]*?absolute inset-0 z-10 sm:hidden)/);
});
