import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createActivityHandler } from "./route";

const req = () => new Request("https://test");
const auth = async () => ({ id: "current", user: { id: "owner", email: "owner@example.com" } });

test("activity requires authentication, scopes owner and returns customer-safe events", async () => {
  assert.equal((await createActivityHandler({ authenticate: async () => null, list: async () => assert.fail() })(req())).status, 401);
  let user = "";
  const events = [{ id: "e", type: "SIGN_IN" as const, occurredAt: new Date(2), deviceLabel: null }];
  const body = await (await createActivityHandler({ authenticate: auth, list: async id => (user = id, events) })(req())).json();
  assert.equal(user, "owner");
  assert.equal(body.events[0].occurredAt, new Date(2).toISOString());
  for (const key of ["metadata", "ipAddress", "userAgent", "payload"]) assert.equal(key in body.events[0], false);
});

test("mobile activity requests only the latest 30 days and at most 50 newest events", async () => {
  const now = Date.UTC(2026, 8, 3, 12);
  const originalNow = Date.now;
  Date.now = () => now;
  let options: { since?: Date; take?: number } | undefined;
  try {
    await createActivityHandler({ authenticate: auth, list: async (_id, received) => (options = received, []) })(req());
  } finally { Date.now = originalNow; }
  assert.equal(options?.since?.toISOString(), new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());
  assert.equal(options?.take, 50);
});

test("mobile filtering does not delete old records or change the web default", () => {
  const service = readFileSync("src/lib/security-service.ts", "utf8");
  assert.match(service, /take: options\.take \?\? 10/);
  assert.match(service, /occurredAt: \{ gte: options\.since \}/);
  assert.doesNotMatch(service, /securityEvent\.(delete|deleteMany)/);
});

test("activity supports empty lists and safe failures", async () => {
  assert.deepEqual(await (await createActivityHandler({ authenticate: auth, list: async () => [] })(req())).json(), { events: [] });
  const response = await createActivityHandler({ authenticate: auth, list: async () => { throw new Error("secret"); } })(req());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret/);
});
