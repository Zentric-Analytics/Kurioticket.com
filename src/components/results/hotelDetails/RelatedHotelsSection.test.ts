import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);

test("renders a keyboard-accessible five-item responsive grid", () => {
  for (const contract of [
    "hotels.slice(0, 5)",
    "buildHotelDetailsHref(hotel.id, searchContext)",
    "getHotelPriceDetails(hotel)",
    "formatDisplayPrice({",
    "data-related-hotels-section",
    "data-related-hotels-grid",
    "grid-cols-1",
    "sm:grid-cols-2",
    "lg:grid-cols-3",
    "xl:grid-cols-5",
    "w-full",
    "estimatedStayTotal",
    "priceUnavailable",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(
    source,
    /overflow-x-auto|snap-x|snap-start|shrink-0|w-\[82%\]|sm:w-\[44%\]|lg:w-\[31%\]/,
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
