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

test("mobile hotel loading geometry matches the full-bleed hero-first property shell", () => {
  for (const contract of [
    "data-hotel-loading-property-identity",
    "data-hotel-loading-metadata",
    "data-hotel-loading-actions",
    "aspect-[6/5]",
    "data-hotel-loading-gallery",
    "data-hotel-loading-hero-actions",
    "size-11 rounded-full bg-white/90",
    "h-11 w-[88px] rounded-full bg-white/90",
    "data-hotel-loading-amenities",
    "data-hotel-loading-mobile-dock",
    "grid-cols-[minmax(0,1fr)_minmax(124px,42%)]",
    "min-[390px]:grid-cols-[minmax(0,1fr)_minmax(140px,0.82fr)]",
    'role="status"',
    'aria-live="polite"',
  ])
    assert.ok(source.includes(contract), contract);

  assert.match(source, /order-1 lg:order-none/);
  assert.match(source, /order-2[\s\S]*data-hotel-loading-property-identity/);
  assert.match(source, /hidden gap-3 lg:flex[\s\S]*data-hotel-loading-actions/);
  assert.doesNotMatch(source, /data-hotel-loading-thumbnails|Array\.from\(\{ length: 5 \}/);
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
