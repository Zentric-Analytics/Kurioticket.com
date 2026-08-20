import assert from "node:assert/strict";
import test from "node:test";
import { createMobileSupportHandler } from "./route";
import type { createSupportTicket } from "@/services/supportService";

type Input = Parameters<typeof createSupportTicket>[0];
const valid = { email: "guest@example.com", subject: "Booking help", category: "search-help", body: "I need help finding my booking, please." } as const;
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("https://test/api/mobile/v1/support/tickets", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

function setup(session: () => Promise<{ user: { id: string; email: string | null; status: string } } | null> = async () => null) {
  const calls: Input[] = [];
  const create = (async (input: Input) => { calls.push(input); return { id: "ticket-1", subject: input.subject }; }) as unknown as typeof createSupportTicket;
  return { calls, handler: createMobileSupportHandler({ session, create, limit: () => ({ allowed: true }) }) };
}

test("guest submission delegates canonical fields once and enforces native context", async () => {
  const { calls, handler } = setup();
  const response = await handler(request({ ...valid, sourceContext: { page: "attacker", platform: "web" } }, { "x-mobile-platform": "ios" }));
  assert.equal(response.status, 201);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { ...valid, userId: undefined, sourceContext: { page: "mobile_support", platform: "native" } });
});

test("canonical guest validation rejects unsafe inputs without creating", async (t) => {
  const invalid: [string, unknown][] = [
    ["missing email", { ...valid, email: undefined }], ["invalid email", { ...valid, email: "bad" }],
    ["missing subject", { ...valid, subject: undefined }], ["empty subject", { ...valid, subject: "" }],
    ["long subject", { ...valid, subject: "x".repeat(161) }], ["invalid category", { ...valid, category: "billing" }],
    ["missing body", { ...valid, body: undefined }], ["empty body", { ...valid, body: "" }],
    ["long body", { ...valid, body: "x".repeat(4001) }], ["unknown field", { ...valid, userId: "victim" }],
  ];
  for (const [name, body] of invalid) await t.test(name, async () => { const s = setup(); assert.equal((await s.handler(request(body))).status, 400); assert.equal(s.calls.length, 0); });
  const s = setup();
  const malformed = new Request("https://test/api", { method: "POST", body: "{" });
  assert.equal((await s.handler(malformed)).status, 400); assert.equal(s.calls.length, 0);
});

test("active session owns user id and email; inactive and expired sessions do not impersonate", async () => {
  const active = setup(async () => ({ user: { id: "user-1", email: "owner@example.com", status: "ACTIVE" } }));
  assert.equal((await active.handler(request({ ...valid, email: "other@example.com" }))).status, 201);
  assert.equal(active.calls[0]?.userId, "user-1"); assert.equal(active.calls[0]?.email, "owner@example.com");
  const inactive = setup(async () => ({ user: { id: "user-2", email: "x@example.com", status: "SUSPENDED" } }));
  assert.equal((await inactive.handler(request(valid))).status, 401); assert.equal(inactive.calls.length, 0);
  const expired = setup(async () => { throw new Error("expired"); });
  assert.equal((await expired.handler(request(valid))).status, 201); assert.equal(expired.calls[0]?.userId, undefined);
});

test("rate limiting returns retry details and prevents creation", async () => {
  const s = setup();
  s.handler = createMobileSupportHandler({ session: async () => null, create: (async () => { throw new Error("must not run"); }) as typeof createSupportTicket, limit: () => ({ allowed: false, retryAfterSeconds: 42 }) });
  const response = await s.handler(request(valid));
  assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), "42"); assert.equal((await response.json()).retryAfterSeconds, 42);
});

test("limiter keys from authenticated identity or normalized guest email, never platform headers", async () => {
  const identities: Array<{ userId?: string; email: string }> = [];
  const create = (async (input: Input) => ({ id: "ticket", subject: input.subject })) as unknown as typeof createSupportTicket;
  const guest = createMobileSupportHandler({ session: async () => null, create, limit: (_request, identity) => { identities.push(identity); return { allowed: true }; } });
  await guest(request({ ...valid, email: "guest@example.com" }, { "x-mobile-platform": "trusted-admin" }));
  const account = createMobileSupportHandler({ session: async () => ({ user: { id: "owner", email: "owner@example.com", status: "ACTIVE" } }), create, limit: (_request, identity) => { identities.push(identity); return { allowed: true }; } });
  await account(request(valid, { "x-mobile-platform": "android" }));
  assert.deepEqual(identities, [{ userId: undefined, email: "guest@example.com" }, { userId: "owner", email: "owner@example.com" }]);
});

test("service and limiter failures are safe and a request never duplicates creation", async () => {
  const create = (async () => { throw new Error("database password secret"); }) as typeof createSupportTicket;
  const handler = createMobileSupportHandler({ session: async () => null, create, limit: () => ({ allowed: true }) });
  const response = await handler(request(valid)); const body = await response.text();
  assert.equal(response.status, 503); assert.doesNotMatch(body, /database|password|secret/i);
  const limiterFailure = createMobileSupportHandler({ session: async () => null, create, limit: () => { throw new Error("limiter down"); } });
  assert.equal((await limiterFailure(request(valid))).status, 503);
});
