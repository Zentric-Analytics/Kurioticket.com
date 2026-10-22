import assert from "node:assert/strict";
import test from "node:test";
import { recordProviderHandoffActivity, type ProviderHandoffActivity } from "./providerHandoffActivity";

const handoff: ProviderHandoffActivity = {
  type: "hotel", provider: "Test provider", route: "Lagos", price: 120, currency: "USD",
  destinationUrl: "https://provider.example/verified-offer", sourcePage: "hotel-details", resultId: "offer-123",
};
const request = new Request("https://kurioticket.com/api/redirect", {
  headers: { cookie: `kt_visitor=${"s".repeat(43)}` },
});

test("guest handoffs persist the same visitor identity in the canonical log and analytics event", async () => {
  let redirect: unknown;
  let event: unknown;
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: null, visitorId: "guest-123" }),
    redirect: async (value) => { redirect = value; },
    event: async (value) => { event = value; },
  });
  assert.deepEqual(redirect, { ...handoff, userId: null, visitorId: "guest-123" });
  assert.deepEqual(event, {
    userId: null, visitorId: "guest-123", type: "REDIRECT", name: "hotel_partner_redirect",
    metadata: { provider: "Test provider", route: "Lagos" },
  });
  assert.ok(!JSON.stringify([redirect, event]).includes("s".repeat(43)), "raw visitor credentials never enter stored records");
});

test("signed-in and non-consenting handoffs preserve authoritative account attribution", async () => {
  let recorded: unknown;
  await recordProviderHandoffActivity(request, { ...handoff, type: "flight" }, {
    identity: async () => ({ userId: "account-123", visitorId: null }),
    redirect: async (value) => { recorded = value; },
    event: async () => {},
  });
  assert.deepEqual(recorded, { ...handoff, type: "flight", userId: "account-123", visitorId: null });
});

test("an optional analytics failure does not lose the independent handoff record or reject", async () => {
  let persisted = false;
  await assert.doesNotReject(recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: null, visitorId: "visitor" }),
    redirect: async () => { persisted = true; },
    event: async () => { throw new Error("analytics unavailable"); },
  }));
  assert.equal(persisted, true);
});

test("a consented handoff is appended to the search journey after its redirect log is stored", async () => {
  let journey: unknown;
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: null, visitorId: "guest-123" }),
    redirect: async () => "redirect-123",
    event: async () => {},
    journey: async (value) => { journey = value; return null; },
  });

  assert.deepEqual(journey, {
    visitorId: "guest-123",
    userId: null,
    type: "PROVIDER_HANDOFF_STARTED",
    eventKey: "redirect:redirect-123",
    product: "HOTEL",
    provider: "Test provider",
    redirectLogId: "redirect-123",
    metadata: { sourcePage: "/hotel-details", resultId: "offer-123" },
  });
});

test("session lookup failure cannot manufacture account ownership", async () => {
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => { throw new Error("session unavailable"); },
    redirect: async (value) => {
      assert.equal(value.userId, null);
      assert.equal(value.visitorId, null);
    },
    event: async () => {},
  });
});

test("signed-in handoff journeys carry authoritative accounts and discard page query data", async () => {
  await recordProviderHandoffActivity(request, { ...handoff, sourcePage: "/hotels/details?token=private#account" }, {
    identity: async () => ({ userId: "account-a", visitorId: "linked-visitor" }),
    redirect: async () => "redirect-123",
    event: async () => {},
    journey: async (value) => {
      assert.equal(value.userId, "account-a");
      assert.equal(value.visitorId, "linked-visitor");
      assert.deepEqual(value.metadata, { sourcePage: "/hotels/details", resultId: "offer-123" });
      return null;
    },
  });
});

test("a validated handoff receipt carries exact search correlation and retries do not duplicate analytics", async () => {
  let events = 0;
  let journey: unknown;
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: "account-a", visitorId: "linked-visitor" }),
    redirect: async () => ({ id: "redirect-123", created: false, visitorId: "linked-visitor", userId: "account-a", searchHistoryId: "search-123", correlation: "linked" }),
    event: async () => { events += 1; },
    journey: async value => { journey = value; return null; },
  });
  assert.equal(events, 0);
  assert.deepEqual(journey, {
    visitorId: "linked-visitor", userId: "account-a", type: "PROVIDER_HANDOFF_STARTED",
    eventKey: "redirect:redirect-123", product: "HOTEL", provider: "Test provider",
    redirectLogId: "redirect-123", searchHistoryId: "search-123",
    metadata: { sourcePage: "/hotel-details", resultId: "offer-123" },
  });
});

test("withdrawal during deferred correlation cannot restore stale visitor attribution", async () => {
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: "account-a", visitorId: "withdrawn-visitor" }),
    redirect: async () => ({ id: "redirect-123", created: true, visitorId: null, userId: "account-a", searchHistoryId: null, correlation: "unavailable" }),
    event: async value => { assert.equal(value.visitorId, null); assert.equal(value.userId, "account-a"); },
    journey: async value => { assert.equal(value.visitorId, null); assert.equal(value.searchHistoryId, undefined); return null; },
  });
});
