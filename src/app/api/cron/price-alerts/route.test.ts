import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("cron route authorization and safe aggregate response", () => {
  const source = readFileSync("src/app/api/cron/price-alerts/route.ts", "utf8");
  assert.match(source, /isAuthorizedCronRequest\(request\)/);
  assert.match(source, /status: 401/);
  assert.match(source, /processed/);
  assert.match(source, /skippedByPreferences/);
  assert.doesNotMatch(source, /alertId|userId|email/);
});

test("hotel provider alerts refresh with the trusted cron request context", () => {
  const route = readFileSync("src/app/api/cron/price-alerts/route.ts", "utf8");
  const processor = readFileSync("src/services/priceAlertProcessor.ts", "utf8");
  assert.match(route, /clientIp: getKayakClientIp\(request\)/);
  assert.match(processor, /hotelId\.startsWith\("kayak-sandbox:"\) \? options\.kayak : undefined/);
  assert.match(processor, /searchHotels\(search as HotelSearchParams, \{/);
});
