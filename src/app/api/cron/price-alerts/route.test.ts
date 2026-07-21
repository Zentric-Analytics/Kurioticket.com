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
