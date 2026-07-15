import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { priceAlertSchema } from "@/lib/validation";

const routeSource = readFileSync("src/app/api/price-alerts/route.ts", "utf8");
const serviceSource = readFileSync("src/services/priceTrackingService.ts", "utf8");

test("price alert API keeps auth, malformed JSON, validation and duplicate handling", () => {
  assert.match(routeSource, /getServerSession\(authOptions\)/);
  assert.match(routeSource, /status: 401/);
  assert.match(routeSource, /request\.json\(\)/);
  assert.match(routeSource, /status: 400/);
  assert.match(routeSource, /DuplicatePriceAlertError/);
  assert.match(routeSource, /status: 409/);
});

test("price alert service detects active or paused flight duplicates without database uniqueness", () => {
  assert.match(serviceSource, /status: \{ in: \["ACTIVE", "PAUSED"\] \}/);
  assert.match(serviceSource, /flightPriceAlertDuplicateKey/);
  assert.doesNotMatch(serviceSource, /@@unique/);
});

test("flight price alert schema hardens canonical creation payload", () => {
  const parsed = priceAlertSchema.safeParse({
    type: "FLIGHT",
    origin: "jfk",
    destination: "lhr",
    targetPrice: "450.00",
    currency: "usd",
    query: {
      tripType: "round-trip",
      origin: "jfk",
      destination: "lhr",
      departureDate: "2026-08-10",
      returnDate: "2026-08-20",
      adults: 1,
      children: 0,
      infants: 0,
      travelers: 1,
      cabinClass: "economy",
      currency: "usd",
      unsafe: "ignored",
    },
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.currency, "USD");
  assert.deepEqual(parsed.data.query, {
    tripType: "round-trip",
    origin: "JFK",
    destination: "LHR",
    departureDate: "2026-08-10",
    returnDate: "2026-08-20",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
    currency: "USD",
  });
  assert.equal(priceAlertSchema.safeParse({ ...parsed.data, query: { ...parsed.data.query, tripType: "multi-city" } }).success, false);
});
