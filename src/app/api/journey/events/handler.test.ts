import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test as runTest } from "node:test";
import { createJourneyEventHandler } from "./handler";
import { resolveRequestActivityIdentity } from "@/services/requestActivityIdentity";
import type { ClientJourneyEventInput } from "@/services/searchJourneyService";
import type { JourneyEventReceipt } from "@/lib/search-journey";

const token = "a".repeat(43);
const nativeToken = "b".repeat(43);
const event = { eventId: randomUUID(), type: "RESULTS_VIEWED", requestId: randomUUID(), sourcePage: "/flights/search" };
const publicOrigin = "https://staging.kurioticket.com";

async function withOrigins(values: { app?: string; auth?: string }, work: () => Promise<void>) {
  const previous = { app: process.env.NEXT_PUBLIC_APP_URL, auth: process.env.NEXTAUTH_URL };
  try {
    if (values.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = values.app;
    if (values.auth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = values.auth;
    await work();
  } finally {
    if (previous.app === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous.app;
    if (previous.auth === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = previous.auth;
  }
}

function test(name: string, work: () => Promise<void>) {
  return runTest(name, () => withOrigins({}, work));
}
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

test("browser journey events use the configured public origin behind an internal proxy URL", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    const f = fixture();
    f.setUser("verified-account");
    for (const type of ["RESULTS_VIEWED", "OFFER_SELECTED"] as const) {
      const response = await f.handler(new Request("http://127.0.0.1:10000/api/journey/events", {
        method: "POST",
        headers: {
          origin: publicOrigin, "sec-fetch-site": "same-origin", cookie: `kt_visitor=${token}`,
          host: "internal-service:10000", "x-forwarded-host": "staging.kurioticket.com", "x-forwarded-proto": "https",
        },
        body: JSON.stringify({ ...event, type }),
      }));
      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), { accepted: true });
    }
    assert.deepEqual(f.records.map(record => ({ type: record.type, userId: record.userId, visitorId: record.visitorId })), [
      { type: "RESULTS_VIEWED", userId: "verified-account", visitorId: "web-visitor" },
      { type: "OFFER_SELECTED", userId: "verified-account", visitorId: "web-visitor" },
    ]);
  });
});

test("canonical journey origin cannot be bypassed with attacker-controlled request or forwarding hosts", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    const f = fixture();
    for (const [url, origin, site] of [
      ["https://attacker.example/api/journey/events", "https://attacker.example", "same-origin"],
      ["http://127.0.0.1:10000/api/journey/events", "http://127.0.0.1:10000", "same-origin"],
      ["http://127.0.0.1:10000/api/journey/events", publicOrigin, "cross-site"],
    ]) {
      const response = await f.handler(new Request(url, {
        method: "POST",
        headers: { origin, "sec-fetch-site": site, cookie: `kt_visitor=${token}`, host: "attacker.example", "x-forwarded-host": "attacker.example", "x-forwarded-proto": "https", forwarded: "host=attacker.example;proto=https" },
        body: JSON.stringify(event),
      }));
      assert.equal(response.status, 403);
    }
    assert.equal(f.visits(), 0);
    assert.equal(f.records.length, 0);
  });
});

test("malformed canonical origin prevents journey writes even when the request URL and auth URL match", async () => {
  await withOrigins({ app: "not a valid URL", auth: "https://kurioticket.com" }, async () => {
    const f = fixture();
    assert.equal((await f.handler(request())).status, 403);
    assert.equal(f.visits(), 0);
    assert.equal(f.records.length, 0);
  });
});

test("headerless-origin iOS and Android journey events remain valid while explicit foreign origins are rejected", async () => {
  await withOrigins({ app: publicOrigin }, async () => {
    for (const platform of ["ios", "android"]) {
      const f = fixture();
      f.setUser("native-account");
      const headers = { "x-mobile-platform": platform, "x-kt-visitor": nativeToken, authorization: "Bearer validated" };
      const response = await f.handler(new Request("http://127.0.0.1:10000/api/journey/events", {
        method: "POST", credentials: "omit", headers, body: JSON.stringify(event),
      }));
      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), { accepted: true });
      assert.equal(f.records[0].visitorId, "native-visitor");
      assert.equal(f.records[0].userId, "native-account");
      const denied = await f.handler(new Request("http://127.0.0.1:10000/api/journey/events", {
        method: "POST", headers: { ...headers, origin: "https://attacker.example" }, body: JSON.stringify(event),
      }));
      assert.equal(denied.status, 403);
      assert.equal(f.visits(), 1);
      assert.equal(f.records.length, 1);
    }
  });
});

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
