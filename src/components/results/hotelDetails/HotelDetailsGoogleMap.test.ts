import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelDetailsGoogleMap.tsx", import.meta.url),
  "utf8",
);

test("uses only the repository Google Maps embed contract", () => {
  for (const contract of [
    "buildGoogleHotelMapEmbedUrl({",
    "NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY",
    "data-hotel-details-google-map",
    'loading="lazy"',
    'referrerPolicy="strict-origin-when-cross-origin"',
    "if (!mapUrl) return null",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /buildHotelMapEmbedUrl|OpenStreetMap|openstreetmap/i);
});
