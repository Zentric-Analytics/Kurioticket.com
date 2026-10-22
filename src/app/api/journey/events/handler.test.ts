import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createJourneyEventHandler } from "./handler";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import type { ClientJourneyEventInput } from "@/services/searchJourneyService";
import type { JourneyEventReceipt } from "@/lib/search-journey";

const token = "a".repeat(43);
const nativeToken = "b".repeat(43);
const event = { eventId: randomUUID(), type: "RESULTS_VIEWED", requestId: randomUUID(), sourcePage: "/flights/search" };
function request(body: unknown = event, headers: Record<string, string> = {}) {
  return new Request("https://kurioticket.com/api/journey/events", {
    method: "POST", headers: { origin: "https://kurioticket.com", cookie: `kt_visitor=${token}`, ...headers }, body: JSON.stringify(body),
  });
}
function fixture() {
  let enabled = true;
  let userId: string | null = null;
  let onPause = async () => {};
  let receipt: (input: ClientJourneyEventInput) => Promise<JourneyEventReceipt> = async () => ({ accepted: true });
  let visits = 0;
  let pauses = 0;
  const records: ClientJourneyEventInput[] = [];
  const resolve = {
    web: async () => userId ? { userId } : null,
    mobile: async () => userId ? { user: { id: userId, status: "ACTIVE" } } : null,
    visitor: async (value: string | null, account: string | null) => {
      visits += 1;
      assert.equal(account, userId);
      return enabled && (value === token || value === nativeToken) ? (value === token ? "web-visitor" : "native-visitor") : null;
    },
  };
  const dependencies = {
    identity: (value: Request) => resolveRequestActivityIdentity(value, resolve),
    record: async (value: ClientJourneyEventInput) => { records.push(value); return receipt(value); },
    pause: async () => { pauses += 1; await onPause(); },
    rateLimit: () => ({ allowed: true, remaining: 59, resetAt: Date.now() + 60_000 }),
  };
  return { handler: createJourneyEventHandler(dependencies), dependencies, records,
    visits: () => visits, pauses: () => pauses,
    setEnabled: (value: boolean) => { enabled = value; }, setUser: (value: string | null) => { userId = value; },
    onPause: (value: () => Promise<void>) => { onPause = value; },
    respond: (value: typeof receipt) => { receipt = value; } };
}

test("declining stops journey events immediately while the HttpOnly withdrawal credential remains", async () => {
  const f = fixture();
  f.setUser("account-a");
  const response = await f.handler(request(event, { cookie: `kt_visitor=${token}; kt_analytics_denied=1` }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: false });
  assert.equal(f.visits(), 0, "the still-granted database visitor must not bypass local denial");
  assert.equal(f.records.length, 0);
  assert.equal(f.pauses(), 0);
});

test("disabled or missing consent is permanently rejected without storage or retry", async () => {
  const f = fixture();
  f.setEnabled(false);
  const response = await f.handler(request());
  assert.deepEqual(await response.json(), { accepted: false });
  assert.equal(f.records.length, 0);
  assert.equal(f.pauses(), 0);
});

test("web and native events carry the validated account and their own visitor transport", async () => {
  const f = fixture();
  f.setUser("account-a");
  assert.deepEqual(await (await f.handler(request(event, { "x-kt-visitor": nativeToken }))).json(), { accepted: true });
  assert.equal(f.records[0].visitorId, "web-visitor");
  assert.equal(f.records[0].userId, "account-a");
  assert.deepEqual(await (await f.handler(request(event, {
    "x-mobile-platform": "android", authorization: "Bearer validated", "x-kt-visitor": nativeToken,
  }))).json(), { accepted: true });
  assert.equal(f.records[1].visitorId, "native-visitor");
  assert.equal(f.records[1].userId, "account-a");
  assert.equal(JSON.stringify(f.records).includes(token), false);
});

test("an event arriving before after()-history succeeds with the same UUID after a bounded wait", async () => {
  const f = fixture();
  let persisted = false;
  f.respond(async () => persisted ? { accepted: true } : { accepted: false, retryable: true });
  f.onPause(async () => { persisted = true; });
  const response = await f.handler(request());
  assert.deepEqual(await response.json(), { accepted: true });
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(f.pauses(), 1);
  assert.equal(f.records.length, 2);
  assert.deepEqual(f.records[0], f.records[1]);
  assert.equal(f.records[0].eventId, event.eventId);
});

test("a longer history race remains explicitly retryable, with no unbounded server wait", async () => {
  const f = fixture();
  f.respond(async () => ({ accepted: false, retryable: true }));
  assert.deepEqual(await (await f.handler(request())).json(), { accepted: false, retryable: true });
  assert.equal(f.records.length, 2);
  assert.equal(f.pauses(), 1);
});

test("withdrawal or account changes during a history retry stop the queued event", async () => {
  for (const changeAccount of [false, true]) {
    const f = fixture();
    f.setUser("account-a");
    f.respond(async () => ({ accepted: false, retryable: true }));
    f.onPause(async () => { if (changeAccount) f.setUser("account-b"); else f.setEnabled(false); });
    assert.deepEqual(await (await f.handler(request())).json(), { accepted: false });
    assert.equal(f.records.length, 1);
  }
});

test("known ownership rejection is permanent and never retried", async () => {
  const f = fixture();
  f.respond(async () => ({ accepted: false }));
  assert.deepEqual(await (await f.handler(request())).json(), { accepted: false });
  assert.equal(f.pauses(), 0);
  assert.equal(f.records.length, 1);
});

test("invalid event shapes, client identity fields, and source URLs or queries never reach storage", async () => {
  const f = fixture();
  for (const body of [
    { ...event, eventId: "not-a-uuid" }, { ...event, requestId: "not-a-server-request" },
    { ...event, userId: "victim" }, { ...event, visitorId: "victim" },
    { ...event, sourcePage: "/flights/search?token=secret" }, { ...event, sourcePage: "/flights#secret" },
    { ...event, sourcePage: "//other.example/path" }, { ...event, sourcePage: "/\\other.example" },
    { ...event, provider: "x".repeat(3000) }, { ...event, type: "SEARCH_COMPLETED" },
  ]) assert.equal((await f.handler(request(body))).status, 400);
  assert.equal(f.records.length, 0);
});

test("cross-origin and rate-limited events are rejected before identity resolution", async () => {
  const f = fixture();
  assert.equal((await f.handler(request(event, { origin: "https://other.example" }))).status, 403);
  const limited = createJourneyEventHandler({ ...f.dependencies,
    rateLimit: () => ({ allowed: false, remaining: 0, resetAt: Date.now() + 30_000 }) });
  const response = await limited(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "30");
  assert.equal(f.visits(), 0);
});
