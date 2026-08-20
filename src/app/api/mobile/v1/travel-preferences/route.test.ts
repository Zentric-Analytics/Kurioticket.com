import assert from "node:assert/strict";
import test from "node:test";
import { createMobileTravelPreferencesHandlers } from "./route";
import type { TravelPreferencesPrisma } from "@/services/travelPreferencesService";

const stored = { homeAirport: "JFK", preferredAirlines: ["AA"], notificationPreferences: { receiveOptionalEmails: true, custom: "keep" } };
function setup(session: "ACTIVE" | "SUSPENDED" | null = "ACTIVE") {
  const calls: unknown[] = [];
  let value = structuredClone(stored);
  const prisma = { travelPreferences: {
    async findUnique(args: unknown) { calls.push(args); return value; },
    async upsert(args: { where: { userId: string }; create: typeof value; update: Partial<typeof value> }) { calls.push(args); value = { ...value, ...args.update }; return value; },
  } } as unknown as TravelPreferencesPrisma;
  const handlers = createMobileTravelPreferencesHandlers({ session: async () => session ? { user: { id: "owner", status: session } } : null, prisma });
  return { handlers, calls, get value() { return value; } };
}
const req = (body?: unknown) => new Request("https://test/api/mobile/v1/travel-preferences", { method: body === undefined ? "GET" : "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });

test("authentication is active-user scoped and ignores submitted user ids", async () => {
  assert.equal((await setup(null).handlers.GET(req())).status, 401);
  assert.equal((await setup("SUSPENDED").handlers.PATCH(req({ homeAirport: "LAX" }))).status, 401);
  const s = setup(); await s.handlers.PATCH(req({ homeAirport: "LAX" }));
  assert.match(JSON.stringify(s.calls), /owner/); assert.doesNotMatch(JSON.stringify(s.calls), /victim/);
  assert.equal((await s.handlers.PATCH(req({ homeAirport: "LAX", userId: "victim" }))).status, 400);
});

test("GET returns stored canonical travel fields without leaking email preference JSON", async () => {
  const response = await setup().handlers.GET(req()); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.hasPreferences, true);
  assert.equal(body.preferences.homeAirport, "JFK"); assert.deepEqual(body.preferences.preferredAirlines, ["AA"]);
  assert.equal(body.preferences.notificationPreferences.receiveOptionalEmails, undefined);
});

test("GET preserves recognized travel notification flags while stripping unrelated keys", async () => {
  const s = setup();
  Object.assign(s.value.notificationPreferences, { emailUpdates: true, priceAlertEmails: true, email: { marketing: true } });
  const response = await s.handlers.GET(req()); const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.preferences.notificationPreferences, { emailUpdates: true, priceAlertEmails: true, travelInspirationEmails: false });
});

test("PATCH updates/clears fields, deduplicates airlines, and preserves email JSON", async () => {
  const s = setup();
  assert.equal((await s.handlers.PATCH(req({ homeAirport: "LAX", preferredAirlines: ["DL", "UA"] }))).status, 200);
  assert.equal(s.value.notificationPreferences.custom, "keep"); assert.equal(s.value.notificationPreferences.receiveOptionalEmails, true);
  assert.equal((await s.handlers.PATCH(req({ homeAirport: "", preferredAirlines: [] }))).status, 200);
  await s.handlers.PATCH(req({ preferredAirlines: ["AA", "AA"] })); assert.deepEqual(s.value.preferredAirlines, ["AA"]);
  for (const invalid of [{}, { nope: true }, { homeAirport: 3 }, { homeAirport: "x".repeat(81) }, { preferredAirlines: Array.from({ length: 11 }, (_, i) => String(i)) }])
    assert.equal((await s.handlers.PATCH(req(invalid))).status, 400);
  const malformed = new Request("https://test", { method: "PATCH", body: "{" }); assert.equal((await s.handlers.PATCH(malformed)).status, 400);
});

test("GET and PATCH service failures return safe responses", async () => {
  const prisma = { travelPreferences: { findUnique: async () => { throw new Error("db secret"); }, upsert: async () => { throw new Error("db secret"); } } } as unknown as TravelPreferencesPrisma;
  const h = createMobileTravelPreferencesHandlers({ session: async () => ({ user: { id: "owner", status: "ACTIVE" } }), prisma });
  assert.equal((await h.GET(req())).status, 503); assert.equal((await h.PATCH(req({ homeAirport: "JFK" }))).status, 503);
});
