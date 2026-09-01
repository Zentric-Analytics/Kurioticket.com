import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelLocationSection.tsx", import.meta.url),
  "utf8",
);

test("renders a factual responsive hotel location card", () => {
  for (const contract of [
    "buildHotelMapEmbedUrl({",
    "buildGoogleHotelStreetViewEmbedUrl({",
    "NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY",
    "data-hotel-location-section",
    'id="hotel-location"',
    "scroll-mt-16",
    "Map showing the location of ${hotelName}",
    "Street View near ${hotelName}",
    "aria-pressed={active}",
    'useState<"map" | "streetview">("map")',
    'loading="lazy"',
    'referrerPolicy="strict-origin-when-cross-origin"',
    "h-[200px]",
    "sm:h-[220px]",
    "lg:h-[240px]",
  ])
    assert.ok(source.includes(contract), contract);
});

test("keeps the stable in-page location anchor without an external directions link", () => {
  assert.match(source, /id="hotel-location"/);
  assert.doesNotMatch(source, /directionsUrl|Show directions|maps\/dir/);
});
test("keeps location-fit and accessibility details visibly expanded", () => {
  assert.match(source, /stayFitFacts\.map/);
  assert.match(source, /Accessibility and location details/);
  assert.doesNotMatch(source, /stayFitFacts\.slice|<details|<summary/);
});
test("keys the iframe to stable property coordinates", () => {
  assert.match(
    source,
    /key=\{`\$\{hotelName\}:\$\{propertyDetails\.latitude\}:\$\{propertyDetails\.longitude\}:\$\{view\}`\}/,
  );
});
