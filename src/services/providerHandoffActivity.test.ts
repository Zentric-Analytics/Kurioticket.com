import assert from "node:assert/strict";
import test from "node:test";
import { recordProviderHandoffActivity, type ProviderHandoffActivity } from "./providerHandoffActivity";
import { createProviderHandoffStore } from "./providerHandoffStore";
import { prepareOperationalSearchSession } from "@/lib/operationalSearchSession";

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
    userId: null, visitorId: "guest-123", applicationSource: "UNKNOWN", type: "REDIRECT", name: "hotel_partner_redirect",
    metadata: { applicationSource: "UNKNOWN", provider: "Test provider", route: "Lagos" },
  });
  assert.ok(!JSON.stringify([redirect, event]).includes("s".repeat(43)), "raw visitor credentials never enter stored records");
});

test("signed-in and non-consenting handoffs preserve authoritative account attribution", async () => {
  let recorded: unknown;
  let optionalCalls = 0;
  await recordProviderHandoffActivity(request, { ...handoff, type: "flight" }, {
    identity: async () => ({ userId: "account-123", visitorId: null }),
    redirect: async (value) => { recorded = value; },
    event: async () => { optionalCalls++; },
    journey: async () => { optionalCalls++; return null; },
  });
  assert.equal(optionalCalls, 0);
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
    metadata: { applicationSource: "UNKNOWN", sourcePage: "/hotel-details", resultId: "offer-123" },
  });
});

test("verified car handoffs use the shared redirect record and CAR journey product", async () => {
  let record: unknown;
  let journey: unknown;
  let event: unknown;
  const car = { ...handoff, type: "car" as const, sourcePage: "/cars/details", resultId: "car-123" };
  await recordProviderHandoffActivity(request, car, {
    identity: async () => ({ userId: null, visitorId: "guest-123" }),
    redirect: async value => { record = value; return "car-redirect-123"; },
    event: async value => { event = value; },
    journey: async value => { journey = value; return null; },
  });
  assert.deepEqual(record, { ...car, userId: null, visitorId: "guest-123" });
  assert.equal((event as { name: string }).name, "car_partner_redirect");
  assert.equal((journey as { product: string }).product, "CAR");
  assert.equal((journey as { redirectLogId: string }).redirectLogId, "car-redirect-123");
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
      assert.deepEqual(value.metadata, { applicationSource: "UNKNOWN", sourcePage: "/hotels/details", resultId: "offer-123" });
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
    metadata: { applicationSource: "UNKNOWN", sourcePage: "/hotel-details", resultId: "offer-123" },
  });
});

test("withdrawal during deferred correlation cannot restore stale visitor attribution", async () => {
  let optionalCalls = 0;
  await recordProviderHandoffActivity(request, handoff, {
    identity: async () => ({ userId: "account-a", visitorId: "withdrawn-visitor" }),
    redirect: async () => ({ id: "redirect-123", created: true, visitorId: null, userId: "account-a", searchHistoryId: null, correlation: "unavailable" }),
    event: async () => { optionalCalls++; },
    journey: async () => { optionalCalls++; return null; },
  });
  assert.equal(optionalCalls, 0);
});

test("an anonymous handoff records its own bounded device on the existing operational log", async () => {
  const before = { AUTH_SECRET: process.env.AUTH_SECRET, TRAVEL_PROVIDER_MODE: process.env.TRAVEL_PROVIDER_MODE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, NEXTAUTH_URL: process.env.NEXTAUTH_URL };
  process.env.AUTH_SECRET = "synthetic-device-observation-test-secret";
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.NEXTAUTH_URL = "https://staging.kurioticket.com";
  try {
    const initial = new Request("https://staging.kurioticket.com/api/cars/search", { headers: {
      origin: "https://staging.kurioticket.com", "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0",
    } });
    const session = prepareOperationalSearchSession(initial)!;
    assert.ok(session);
    const headers = new Headers(initial.headers);
    headers.set("cookie", "kt_search_session=" + session.credential);
    const request = new Request("https://staging.kurioticket.com/api/redirect", { headers });
    const rows: Array<{ metadata: Record<string, unknown> }> = [];
    const tx = { redirectLog: { create: async ({ data }: { data: typeof rows[number] }) => {
      rows.push(data); return { id: "redirect-observation" };
    } } };
    type Database = NonNullable<ReturnType<Parameters<typeof createProviderHandoffStore>[0]>>;
    const database = { $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Database;
    const store = createProviderHandoffStore(() => database);
    await recordProviderHandoffActivity(request, handoff, {
      identity: async () => ({ userId: null, visitorId: null, applicationSource: "WEB" }),
      redirect: store.recordRedirect,
      event: async () => { assert.fail("no optional analytics without consent"); },
      journey: async () => { assert.fail("no optional journey without consent"); },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].metadata.operationalSessionId, session.reference.id);
    assert.deepEqual(rows[0].metadata.guestAccess, { version: 1, platform: "desktop", deviceLabel: "Windows computer", browser: "Chrome 140", os: "Windows" });
    assert.ok(!JSON.stringify(rows[0].metadata).includes(session.credential));
    assert.doesNotMatch(JSON.stringify(rows[0].metadata), /Mozilla|user-agent/);
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
