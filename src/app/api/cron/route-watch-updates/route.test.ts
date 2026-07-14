import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("route watch cron route uses bearer auth and aggregate safe counts", () => {
  const source = readFileSync("src/app/api/cron/route-watch-updates/route.ts", "utf8");
  assert.match(source, /isAuthorizedRouteWatchCronRequest\(request\)/);
  assert.match(source, /status: 401/);
  for (const key of ["processed", "initialized", "checked", "notified", "skippedPreferences", "skippedSuppressed", "skippedPriceAlert", "skippedThreshold", "skippedDuplicate", "expired", "failed"]) {
    assert.match(source, new RegExp(key));
  }
  assert.doesNotMatch(source, /toEmail|savedSearch\.query/);
});
