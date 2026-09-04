import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canonicalHotelAddress, hotelStaySummary } from "./nativeHotelDetailsModel";

test("stay summary uses full dates and correct count grammar", () => {
  assert.match(hotelStaySummary("2026-09-04", "2026-09-05", 1, 1).dates!, /2026.*1 night/);
  assert.equal(hotelStaySummary("2026-09-04", "2026-09-07", 2, 1).occupancy, "2 guests, 1 room");
  assert.equal(hotelStaySummary("2026-09-04", "2026-09-07", 1, 2).occupancy, "1 guest, 2 rooms");
});
test("canonical Hotel address is enriched, deduplicated, and falls back", () => {
  assert.equal(canonicalHotelAddress(null, "Paris, France"), "Paris, France");
  assert.equal(canonicalHotelAddress({ description: "", latitude: 1, longitude: 2, streetAddress: "8 Rue van Gogh", city: "Paris", country: "France", neighbourhood: "" }, "fallback"), "8 Rue van Gogh, Paris, France");
  assert.equal(canonicalHotelAddress({ description: "", latitude: 1, longitude: 2, streetAddress: "Paris, France", city: "Paris", country: "France", neighbourhood: "" }, "fallback"), "Paris, France");
});

test("Hotel details enrichment encodes the complete identity and remains abortable and stale-safe", () => {
  const api = readFileSync("src/api/travelApi.ts", "utf8");
  const screen = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
  assert.match(api, /`\/api\/hotels\/details\?\$\{params\.toString\(\)\}`/);
  for (const field of ["id", "checkIn", "checkOut"]) assert.match(api, new RegExp(`${field}: input\\.${field}`));
  for (const field of ["guests", "rooms"]) assert.match(api, new RegExp(`${field}: String\\(input\\.${field}\\)`));
  assert.match(api, /options: \{ signal\?: AbortSignal \}/);
  assert.match(screen, /const enrichmentKey = `\$\{result\.id\}/);
  assert.match(screen, /response\.hotel\?\.id === result\.id/);
  assert.match(screen, /controller\.abort\(\)/);
  assert.match(screen, /\.catch\(\(\) => undefined\)/);
});
