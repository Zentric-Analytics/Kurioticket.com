import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);

test("renders seven hotels in a native mobile rail and a desktop grid", () => {
  for (const contract of [
    "hotels.slice(0, 7)",
    "buildHotelDetailsHref(hotel.id, searchContext)",
    "getHotelPriceDetails(hotel)",
    "formatDisplayPrice({",
    "data-related-hotels-section",
    "data-related-hotels-grid",
    "flex w-full",
    "overflow-x-auto",
    "overflow-y-hidden",
    "overscroll-x-contain",
    "snap-x snap-mandatory",
    "snap-start",
    "w-[82vw]",
    "max-w-[300px]",
    "shrink-0",
    "lg:grid-cols-4",
    "lg:grid",
    "lg:overflow-visible",
    "lg:w-full",
    "aspect-video",
    "(max-width: 1023px) min(82vw, 300px), 25vw",
    "estimatedStayTotal",
    "priceUnavailable",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /grid-cols-1|sm:grid-cols-2|lg:grid-cols-3/);
  assert.doesNotMatch(source, /rawProviderReference|review count|only 1 room/i);
});

test("uses one semantic card link without nested actions", () => {
  assert.equal(source.match(/<Link\b/g)?.length, 1);
  assert.doesNotMatch(source, /<button\b/);
  assert.match(
    source,
    /aria-label=\{`\$\{labels\.viewHotel\}: \$\{hotel\.name\}`\}/,
  );
});
