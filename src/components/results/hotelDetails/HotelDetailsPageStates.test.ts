import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelDetailsPageStates.tsx", import.meta.url),
  "utf8",
);
const routeLoadingSource = readFileSync(
  new URL("../../../app/hotels/details/[id]/loading.tsx", import.meta.url),
  "utf8",
);

test("mobile hotel loading geometry matches the loaded property shell", () => {
  for (const contract of [
    "data-hotel-loading-property-identity",
    "data-hotel-loading-metadata",
    "data-hotel-loading-actions",
    "aspect-[16/10]",
    "data-hotel-loading-thumbnails",
    "Array.from({ length: 5 }",
    "grid-cols-5 gap-1.5",
    "data-hotel-loading-amenities",
    "data-hotel-loading-mobile-dock",
    "grid-cols-[minmax(0,1fr)_minmax(132px,0.9fr)]",
    'role="status"',
    'aria-live="polite"',
  ])
    assert.ok(source.includes(contract), contract);

  assert.match(source, /lg:hidden/);
  assert.doesNotMatch(source, /grid-cols-4 gap-2/);
});

test("the destination route owns the branded first loading paint", () => {
  assert.match(
    routeLoadingSource,
    /<div className="hidden lg:block" data-hotel-details-desktop-header>[\s\S]*?<AppHeader/,
  );
  assert.match(routeLoadingSource, /hideDesktopTravelNav/);
  assert.match(routeLoadingSource, /hideMobileCategoryTabs/);
  assert.match(
    routeLoadingSource,
    /pt-\[env\(safe-area-inset-top\)\] lg:pt-0/,
  );
  assert.match(routeLoadingSource, /<HotelDetailsLoadingState/);
});

test("the unavailable route keeps results navigation ahead of its content", () => {
  const unavailable = source.slice(
    source.indexOf("export function HotelDetailsUnavailableState"),
  );
  assert.ok(
    unavailable.indexOf("<DetailsBackLink") < unavailable.indexOf("<Card"),
  );
  assert.match(unavailable, /href=\{resultsHref\}/);
});
