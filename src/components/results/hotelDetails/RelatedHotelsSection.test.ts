import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);

test("renders up to twelve mobile related Hotels while preserving seven desktop cards", () => {
  for (const contract of [
    "hotels.slice(0, 12)",
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
    "px-4 lg:mt-6 lg:px-0",
    "scroll-px-0",
    "snap-start",
    "w-[241px]",
    "max-w-[78vw]",
    "shrink-0",
    "lg:grid-cols-4",
    "lg:grid",
    "lg:overflow-visible",
    "lg:w-full",
    "h-[150px]",
    "lg:aspect-video",
    "(max-width: 1023px) min(78vw, 241px), 25vw",
    "estimatedStayTotal",
    "priceUnavailable",
    "desktopHidden={index >= 7}",
    "lg:hidden",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /grid-cols-1|sm:grid-cols-2|lg:grid-cols-3/);
  assert.doesNotMatch(source, /data-related-hotels-grid[\s\S]*?px-4/);
  assert.doesNotMatch(
    source,
    /touch-pan-x|touch-action\s*:\s*(?:pan-x|none)|overscroll-behavior\s*:\s*none/,
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
