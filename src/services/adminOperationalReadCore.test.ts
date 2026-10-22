import assert from "node:assert/strict";
import test from "node:test";
import { createAdminOperationalReadService, __adminOperationalReadCoreTest } from "./adminOperationalReadCore";

test("authorization happens before query validation or storage", async () => {
  let databaseTouched = false;
  const service = createAdminOperationalReadService({
    authorize: async () => false,
    database: () => { databaseTouched = true; return null; },
    environment: () => "staging",
  });
  const result = await service.searches.list(new URLSearchParams("unknown=1"));
  assert.equal(result.status, "forbidden");
  assert.equal(databaseTouched, false);
});

test("safe provider helpers remove URL details and unsafe source paths", () => {
  assert.equal(__adminOperationalReadCoreTest.safeDomain("https://provider.example/deal?secret=1#x"), "provider.example");
  assert.equal(__adminOperationalReadCoreTest.safeDomain("javascript:alert(1)"), null);
  assert.equal(__adminOperationalReadCoreTest.safePath("https://staging.kurioticket.com/hotels/results?token=abc"), "/hotels/results");
});

test("support source context only returns allowlisted bounded text", () => {
  const source = __adminOperationalReadCoreTest.safeSource({
    page: "mobile_support",
    platform: "ios",
    secret: "do-not-return",
    action: "ticket",
  } as never);
  assert.deepEqual(source, { page: "mobile_support", platform: "ios", action: "ticket" });
});

test("identity classification distinguishes registered, guest and unattributed records", () => {
  assert.equal(__adminOperationalReadCoreTest.identity("user_123", "visitor_123").kind, "registered");
  assert.equal(__adminOperationalReadCoreTest.identity(null, "visitor_123").kind, "guest");
  assert.equal(__adminOperationalReadCoreTest.identity(null, null).kind, "unattributed");
});
