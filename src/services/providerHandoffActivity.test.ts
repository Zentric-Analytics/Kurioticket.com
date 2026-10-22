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
