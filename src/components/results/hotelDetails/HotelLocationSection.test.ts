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
    "buildHotelDirectionsUrl(propertyDetails)",
    "data-hotel-location-section",
    "Map showing the location of ${hotelName}",
    "Street View near ${hotelName}",
    'aria-pressed={active}',
    'useState<"map" | "streetview">("map")',
    'loading="lazy"',
    'referrerPolicy="strict-origin-when-cross-origin"',
    'target="_blank"',
    'rel="noopener noreferrer"',
    "h-[200px]",
    "sm:h-[220px]",
    "lg:h-[240px]",
  ]) assert.ok(source.includes(contract), contract);
});
test("keys the iframe to stable property coordinates", () => {
  assert.match(
    source,
    /key=\{`\$\{hotelName\}:\$\{propertyDetails\.latitude\}:\$\{propertyDetails\.longitude\}:\$\{view\}`\}/,
  );
});
