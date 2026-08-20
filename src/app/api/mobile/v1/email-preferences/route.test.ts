import assert from "node:assert/strict";
import test from "node:test";
import { createMobileEmailPreferencesHandlers } from "./route";
import type { handleEmailPreferencesGet } from "@/app/api/account/email-preferences/route";

type Prisma = Parameters<typeof handleEmailPreferencesGet>[1];
const defaults = { receiveOptionalEmails: false, priceAlerts: false, travelInspiration: false, productUpdates: false, dealsRecommendations: false };
function setup(session: "ACTIVE" | "SUSPENDED" | null = "ACTIVE", initial: unknown = null) {
  const calls: unknown[] = []; let notificationPreferences = initial;
  const prisma = { travelPreferences: {
    async findUnique(args: unknown) { calls.push(args); return notificationPreferences === null ? null : { notificationPreferences, updatedAt: new Date(0) }; },
    async upsert(args: { where: { userId: string }; create: { notificationPreferences: unknown }; update: { notificationPreferences: unknown } }) { calls.push(args); notificationPreferences = args.update.notificationPreferences; return { notificationPreferences }; },
  }, user: { async findUnique(args: unknown) { calls.push(args); return null; } } } as unknown as Prisma;
  return { handlers: createMobileEmailPreferencesHandlers({ session: async () => session ? { user: { id: "owner", status: session } } : null, prisma }), calls, get stored() { return notificationPreferences; } };
}
const req = (body?: unknown) => new Request("https://test/api/mobile/v1/email-preferences", { method: body === undefined ? "GET" : "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });

test("authentication rejects missing/inactive sessions and scopes persistence", async () => {
  assert.equal((await setup(null).handlers.GET(req())).status, 401); assert.equal((await setup("SUSPENDED").handlers.PATCH(req(defaults))).status, 401);
  const s = setup(); await s.handlers.PATCH(req({ ...defaults, userId: "victim" })); assert.doesNotMatch(JSON.stringify(s.calls), /victim/);
  await s.handlers.PATCH(req(defaults)); assert.match(JSON.stringify(s.calls), /owner/);
});

test("GET returns defaults and stored values while ignoring unrelated legacy keys", async () => {
  assert.deepEqual(await (await setup().handlers.GET(req())).json(), { hasPreferences: false, preferences: defaults });
  const saved = { email: { ...defaults, priceAlerts: true }, unrelated: "keep" };
  assert.deepEqual(await (await setup("ACTIVE", saved).handlers.GET(req())).json(), { hasPreferences: true, preferences: { ...defaults, priceAlerts: true } });
});

test("PATCH requires the full strict boolean payload and preserves unrelated keys", async () => {
  const s = setup("ACTIVE", { unrelated: "keep", ...defaults }); const changed = { ...defaults, receiveOptionalEmails: true, priceAlerts: true };
  assert.equal((await s.handlers.PATCH(req(changed))).status, 200); assert.equal((s.stored as Record<string, unknown>).unrelated, "keep");
  for (const invalid of [{ ...changed, priceAlerts: undefined }, { ...changed, priceAlerts: "yes" }, { ...changed, extra: true }]) assert.equal((await s.handlers.PATCH(req(invalid))).status, 400);
  assert.equal((await s.handlers.PATCH(new Request("https://test", { method: "PATCH", body: "{" }))).status, 400);
  assert.equal((await s.handlers.PATCH(req(changed))).status, 200);
});

test("canonical database failures are safely translated", async () => {
  const prisma = { travelPreferences: { findUnique: async () => { throw new Error("database secret"); } }, user: {} } as unknown as Prisma;
  const h = createMobileEmailPreferencesHandlers({ session: async () => ({ user: { id: "owner", status: "ACTIVE" } }), prisma });
  const response = await h.GET(req()); assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /database|secret/i);
});
