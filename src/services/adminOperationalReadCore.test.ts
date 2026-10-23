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
  assert.equal(__adminOperationalReadCoreTest.safePath("/hotels/results?token=abc"), "/hotels/results");
  assert.equal(__adminOperationalReadCoreTest.safePath("https://staging.kurioticket.com/hotels/results?token=abc"), null);
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

test("withdrawn or disabled visitors are not exposed as attributed identities", () => {
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "GRANTED", trackingDisabledAt: null }),
    "visitor_123",
  );
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "WITHDRAWN", trackingDisabledAt: new Date() }),
    null,
  );
  assert.equal(
    __adminOperationalReadCoreTest.attributableVisitorId("visitor_123", { consentStatus: "GRANTED", trackingDisabledAt: new Date() }),
    null,
  );
});

test("identity classification distinguishes registered, guest and unattributed records", () => {
  assert.equal(__adminOperationalReadCoreTest.identity("user_123", "visitor_123").kind, "registered");
  assert.equal(__adminOperationalReadCoreTest.identity(null, "visitor_123").kind, "guest");
  assert.equal(__adminOperationalReadCoreTest.identity(null, null).kind, "unattributed");
});

test("registered customer drilldowns include only their direct and exclusively linked consented guest records", () => {
  const { identityWhere } = __adminOperationalReadCoreTest;
  assert.deepEqual(identityWhere({ identity: "registered", userId: "user_123", visitorId: null }), {
    OR: [
      { userId: "user_123" },
      { userId: null, visitor: { is: {
        currentUserId: "user_123",
        consentStatus: "GRANTED",
        trackingDisabledAt: null,
        identityLinks: {
          some: { userId: "user_123" },
          none: { userId: { not: "user_123" } },
        },
      } } },
    ],
  });
  // A general registered-identity filter still shows only directly registered records.
  assert.deepEqual(identityWhere({ identity: "registered", userId: null, visitorId: null }),
    { userId: { not: null } });
  // Explicit visitor filters continue to require consent and that precise visitor.
  assert.deepEqual(identityWhere({ identity: "registered", userId: "user_123", visitorId: "visitor_123" }), {
    userId: "user_123",
    visitorId: "visitor_123",
    visitor: { is: { consentStatus: "GRANTED", trackingDisabledAt: null } },
  });
  assert.deepEqual(identityWhere({ identity: "guest", userId: null, visitorId: "visitor_123" }), {
    userId: null, visitorId: "visitor_123",
    visitor: { is: { consentStatus: "GRANTED", trackingDisabledAt: null } },
  });
});
