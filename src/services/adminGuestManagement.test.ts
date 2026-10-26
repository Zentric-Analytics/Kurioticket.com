import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { fsCache: false });
const { disableGuestTrackingAsAdmin } = jiti("./adminGuestManagement") as typeof import("./adminGuestManagement");

const id = "qa-guest-identity-123";
const date = new Date("2026-10-26T12:00:00Z");
const actor = { userId: "qa-admin", email: "ADMIN@example.invalid" };

type Mode = "eligible" | "missing" | "linked" | "withdrawn" | "write_conflict" | "linked_by_account";
function fixture(mode: Mode) {
  const steps: string[] = [];
  const values: Record<string, unknown[]> = { consent: [], audit: [] };
  let calls = 0;
  const tx = {
    visitor: {
      findUnique: async () => {
        calls++;
        steps.push("read");
        if (mode === "missing") return null;
        if (calls === 1) return { tokenHash: "sha256-opaque-hash" };
        return {
          consentStatus: mode === "withdrawn" ? "WITHDRAWN" : "GRANTED",
          trackingDisabledAt: mode === "withdrawn" ? date : null,
          currentUserId: mode === "linked_by_account" ? "qa-user" : null,
          identityLinks: mode === "linked" ? [{ userId: "qa-user" }] : [],
        };
      },
      updateMany: async (arg: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        steps.push("update");
        assert.equal(arg.where.id, id);
        assert.equal(arg.where.consentStatus, "GRANTED");
        assert.equal(arg.data.consentStatus, "WITHDRAWN");
        assert.equal(arg.data.trackingDisabledAt, date);
        return { count: mode === "write_conflict" ? 0 : 1 };
      },
    },
    $queryRaw: async () => { steps.push("row-lock"); return [{ id }]; },
    visitorConsent: { create: async (arg: { data: Record<string, unknown> }) => {
      steps.push("consent");
      values.consent.push(arg.data);
    } },
    adminAuditLog: { create: async (arg: { data: Record<string, unknown> }) => {
      steps.push("audit");
      values.audit.push(arg.data);
    } },
  };
  const lock = async (_unused: unknown, tokenHash: string) => {
    assert.equal(tokenHash, "sha256-opaque-hash");
    steps.push("credential-lock");
  };
  return { tx, steps, values, lock };
}

test("disables only a consenting, unlinked guest with durable consent + admin audit evidence", async () => {
  const f = fixture("eligible");
  const result = await disableGuestTrackingAsAdmin(f.tx as never, id, actor, date, f.lock as never);
  assert.equal(result, "disabled");
  assert.deepEqual(f.steps, ["read", "credential-lock", "row-lock", "read", "update", "consent", "audit"]);
  assert.equal(f.values.consent.length, 1);
  assert.deepEqual(f.values.consent[0], { visitorId: id, purpose: "ANALYTICS", status: "WITHDRAWN", recordedAt: date });
  assert.equal(f.values.audit.length, 1);
  assert.deepEqual(f.values.audit[0], {
    adminUserId: "qa-admin", adminEmail: "admin@example.invalid",
    action: "GUEST_TRACKING_DISABLED", targetType: "Visitor", targetId: id,
    metadata: { previousStatus: "GRANTED", nextStatus: "WITHDRAWN", initiatedBy: "ADMIN" },
  });
});

for (const [mode, outcome] of [
  ["missing", "not_found"],
  ["linked", "not_eligible"],
  ["linked_by_account", "not_eligible"],
  ["withdrawn", "already_disabled"],
  ["write_conflict", "not_eligible"],
] as const) {
  test(`${mode} guest cannot be changed or audited as a successful action`, async () => {
    const f = fixture(mode);
    const result = await disableGuestTrackingAsAdmin(f.tx as never, id, actor, date, f.lock as never);
    assert.equal(result, outcome);
    assert.deepEqual(f.values.consent, []);
    assert.deepEqual(f.values.audit, []);
    if (mode !== "write_conflict") assert.ok(!f.steps.includes("update"));
  });
}
