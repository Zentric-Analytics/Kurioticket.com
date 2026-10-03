import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelLocationSection.tsx", import.meta.url),
  "utf8",
);
const defaultView = source.slice(
  source.indexOf('\n  return (', source.indexOf('if (variant === "desktop")')),
);

test("renders a factual responsive hotel location card", () => {
  for (const contract of [
    "buildGoogleHotelMapEmbedUrl({",
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
    "h-[216px]",
    "sm:h-[220px]",
    "lg:h-[240px]",
  ])
    assert.ok(source.includes(contract), contract);
});

test("keeps the location anchor without an external Open in Maps text link", () => {
  assert.match(defaultView, /id="hotel-location"/);
  assert.doesNotMatch(source, /directionsUrl|Open in Maps|buildHotelDirectionsUrl|ArrowUpRight/);
});
test("enables the fallback map only for the desktop variant", () => {
  assert.match(source, /variant = "default"/);
  assert.match(source, /const mapUrl = variant === "desktop"\s*\? buildHotelMapEmbedUrl\([^;]+:\s*buildGoogleHotelMapEmbedUrl\(/);
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
