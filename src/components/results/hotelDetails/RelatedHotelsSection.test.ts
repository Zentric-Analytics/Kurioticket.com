import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);

test("renders a keyboard-accessible seven-item responsive grid", () => {
  for (const contract of [
    "hotels.slice(0, 7)",
    "buildHotelDetailsHref(hotel.id, searchContext)",
    "getHotelPriceDetails(hotel)",
    "formatDisplayPrice({",
    "data-related-hotels-section",
    "data-related-hotels-grid",
    "grid-cols-1",
    "sm:grid-cols-2",
    "lg:grid-cols-4",
    "min-w-0 w-full",
    "aspect-video",
    "(max-width: 1023px) 50vw, 25vw",
    "estimatedStayTotal",
    "priceUnavailable",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(
    source,
    /lg:grid-cols-3|overflow-x-auto|snap-x|snap-proximity|snap-start|shrink-0|w-\[82%\]|sm:w-\[44%\]|lg:w-\[31%\]/,
  );
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
