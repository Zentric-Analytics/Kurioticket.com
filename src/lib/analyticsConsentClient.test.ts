import assert from "node:assert/strict";
import test from "node:test";

import {
  createVisitorConsentSynchronizer,
  analyticsDenialCookie,
  hasAnalyticsDenial,
  parseAnalyticsConsent,
  resolveAnalyticsConsentChoice,
  type AnalyticsConsentChoice,
} from "./analyticsConsentClient";

const enabled = () => Response.json({ analyticsTracking: "enabled" });
const disabled = () => Response.json({ analyticsTracking: "disabled" });
const merged = () => Response.json({ merged: true });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("consent parsing accepts only an explicit saved choice", () => {
  assert.equal(parseAnalyticsConsent("granted"), "granted");
  assert.equal(parseAnalyticsConsent("declined"), "declined");
  for (const input of [null, "true", "enabled", "{}", ""]) assert.equal(parseAnalyticsConsent(input), null);
});

test("failed preference storage cannot restore an older grant over a current refusal", async () => {
  const calls: string[] = [];
  const readChoice = () => resolveAnalyticsConsentChoice({ saved: "granted", current: "declined", saveFailed: true, denied: false });
  const sync = createVisitorConsentSynchronizer({
    readChoice,
    request: async (_url, init) => { calls.push(init.method!); return disabled(); },
  });
  assert.equal(await sync.sync({ choice: "declined", accountKey: "guest" }), "saved");
  assert.deepEqual(calls, ["DELETE"]);
});

test("the immediate deny marker overrides saved grants and is safe for all first-party paths", () => {
  assert.equal(resolveAnalyticsConsentChoice({ saved: "granted", current: "granted", saveFailed: false, denied: true }), "declined");
  assert.equal(hasAnalyticsDenial("theme=dark; kt_analytics_denied=1; kt_visitor=opaque"), true);
  assert.equal(hasAnalyticsDenial("not_kt_analytics_denied=1"), false);
  assert.equal(analyticsDenialCookie(true, true), "kt_analytics_denied=1; Path=/; SameSite=Lax; Max-Age=31536000; Secure");
  assert.equal(analyticsDenialCookie(false, false), "kt_analytics_denied=; Path=/; SameSite=Lax; Max-Age=0");
});

test("unknown consent and a loading session never grant a visitor identity", async () => {
  const calls: string[] = [];
  let choice: AnalyticsConsentChoice = null;
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => choice,
    request: async (url) => { calls.push(url); return enabled(); },
  });
  assert.equal(await sync.sync({ choice, accountKey: "guest" }), "idle");
  choice = "granted";
  assert.equal(await sync.sync({ choice, accountKey: null }), "idle");
  assert.deepEqual(calls, []);
});

test("explicit grant is registered before account linking and never sends the account ID", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async (url, init) => { calls.push({ url, init }); return url.endsWith("merge") ? merged() : enabled(); },
  });
  assert.equal(await sync.sync({ choice: "granted", accountKey: "account-123" }), "saved");
  assert.deepEqual(calls.map((call) => call.url), ["/api/identity/visitor", "/api/identity/merge"]);
  assert.deepEqual(JSON.parse(calls[0].init.body as string), { analytics: true, policyVersion: "analytics-v1" });
  assert.equal(calls[1].init.body, undefined);
  assert.equal(calls[0].init.credentials, "same-origin");
});

test("rerenders do not duplicate confirmed consent work, and logout requests a fresh guest context", async () => {
  const calls: string[] = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async (url) => { calls.push(url); return url.endsWith("merge") ? merged() : enabled(); },
  });
  await sync.sync({ choice: "granted", accountKey: "account-123" });
  await sync.sync({ choice: "granted", accountKey: "account-123" });
  assert.equal(calls.length, 2);
  await sync.sync({ choice: "granted", accountKey: "guest" });
  assert.deepEqual(calls, ["/api/identity/visitor", "/api/identity/merge", "/api/identity/visitor"]);
});

test("withdrawal while a grant is in flight is applied last and skips stale account linking", async () => {
  let choice: AnalyticsConsentChoice = "granted";
  let finishGrant!: (response: Response) => void;
  const calls: string[] = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => choice,
    request: async (url, init) => {
      calls.push(`${init.method} ${url}`);
      if (init.method === "DELETE") return disabled();
      return new Promise<Response>((resolve) => { finishGrant = resolve; });
    },
  });
  const grant = sync.sync({ choice, accountKey: "account-123" });
  await tick();
  choice = "declined";
  const withdrawal = sync.sync({ choice, accountKey: "account-123" });
  finishGrant(enabled());
  assert.equal(await grant, "saved");
  assert.equal(await withdrawal, "saved");
  assert.deepEqual(calls, ["POST /api/identity/visitor", "DELETE /api/identity/visitor"]);
});

test("a later choice from another tab is rechecked after the grant response", async () => {
  let choice: AnalyticsConsentChoice = "granted";
  let finishGrant!: (response: Response) => void;
  const calls: string[] = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => choice,
    request: async (_url, init) => {
      calls.push(init.method!);
      if (init.method === "DELETE") return disabled();
      return new Promise<Response>((resolve) => { finishGrant = resolve; });
    },
  });
  const pending = sync.sync({ choice, accountKey: "guest" });
  await tick();
  choice = "declined"; // Storage changed before the storage-event callback runs.
  finishGrant(enabled());
  assert.equal(await pending, "saved");
  assert.deepEqual(calls, ["POST", "DELETE"]);
});

test("sign-out during registration skips the old account merge and reconciles the guest context", async () => {
  let finishGrant!: (response: Response) => void;
  const calls: string[] = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async (url) => {
      calls.push(url);
      return calls.length === 1 ? new Promise<Response>((resolve) => { finishGrant = resolve; }) : enabled();
    },
  });
  const pending = sync.sync({ choice: "granted", accountKey: "account-123" });
  await tick();
  void sync.sync({ choice: "granted", accountKey: "guest" });
  finishGrant(enabled());
  assert.equal(await pending, "saved");
  assert.deepEqual(calls, ["/api/identity/visitor", "/api/identity/visitor"]);
});

test("network failure leaves the choice unconfirmed and permits a successful retry", async () => {
  let fails = true;
  const states: string[] = [];
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => "declined",
    onState: (state) => states.push(state),
    request: async () => {
      if (fails) throw new Error("Offline");
      return disabled();
    },
  });
  assert.equal(await sync.sync({ choice: "declined", accountKey: "guest" }), "error");
  assert.equal(states.at(-1), "error");
  fails = false;
  assert.equal(await sync.sync({ choice: "declined", accountKey: "guest" }, true), "saved");
  assert.equal(states.at(-1), "saved");
});

test("an unsuccessful account merge is not reported as a saved connection", async () => {
  const sync = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async (url) => url.endsWith("merge") ? Response.json({ merged: false }) : enabled(),
  });
  assert.equal(await sync.sync({ choice: "granted", accountKey: "account-123" }), "error");
});
