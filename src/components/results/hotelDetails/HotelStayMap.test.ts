import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./HotelStayMap.tsx", import.meta.url),
  "utf8",
);

test("uses the configured Google preference with the coordinate-backed map fallback", () => {
  for (const contract of [
    "buildHotelMapEmbedUrl({",
    "NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY",
    "propertyDetails",
    'loading="lazy"',
    'referrerPolicy="strict-origin-when-cross-origin"',
    "data-hotel-stay-map",
    "Property location",
  ])
    assert.ok(source.includes(contract), contract);
  assert.doesNotMatch(source, /maps\/dir|Show directions|apiKey\s*[:=]\s*["'][^"']+/);
});

test("does not render a map when catalogue coordinates and configured embed are unavailable", () => {
  assert.match(source, /if \(!mapUrl\) return null/);
});
