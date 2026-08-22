import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { validateMobileBearer, validateMobileDeletionReactivationBearer } from "./account-session";
import { requireMobileSecurity } from "./mobile-security-route";

const secret = "a".repeat(43);
const bearer = (value = secret) => new Request("https://test/reactivate", { headers: { authorization: `Bearer ktm1.session-1.${value}` } });
const tokenHash = createHash("sha256").update(secret).digest("hex");

function eligible(overrides: Record<string, unknown> = {}, userOverrides: Record<string, unknown> = {}) {
  return {
    id: "session-1", userId: "user-1", client: "MOBILE", tokenHash,
    expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date(), revokeReason: "account_deletion_requested",
    sessionVersion: 4, authMethod: "PASSWORD", assuranceLevel: "PRIMARY", lastSeenAt: new Date(),
    user: { id: "user-1", status: "PENDING_DELETION", email: "owner@example.com", emailVerified: new Date(), sessionVersion: 5, accounts: [], securitySettings: null, ...userOverrides },
    ...overrides,
  };
}

const lookup = (session: ReturnType<typeof eligible> | null) => async () => session as never;

test("normal mobile authentication still rejects the bearer revoked for deletion", async () => {
  assert.equal(await validateMobileBearer(bearer(), lookup(eligible())), null);
  assert.equal(await requireMobileSecurity(bearer(), async () => eligible() as never), null);
});

test("deletion-reactivation authentication accepts only the exact deletion transition", async () => {
  const result = await validateMobileDeletionReactivationBearer(bearer(), lookup(eligible()));
  assert.equal(result?.user.id, "user-1");
  assert.equal(result?.user.email, "owner@example.com");
});

test("deletion-reactivation authentication rejects malformed and mismatched bearers", async () => {
  assert.equal(await validateMobileDeletionReactivationBearer(new Request("https://test"), async () => assert.fail("malformed bearer must not query")), null);
  assert.equal(await validateMobileDeletionReactivationBearer(bearer("b".repeat(43)), lookup(eligible())), null);
});

test("deletion-reactivation authentication rejects ineligible sessions", async () => {
  const cases = [
    eligible({ client: "WEB" }),
    eligible({ expiresAt: new Date(Date.now() - 1) }),
    eligible({ revokedAt: null }),
    eligible({ revokeReason: "user_revoked" }),
    eligible({ sessionVersion: 5 }),
    eligible({ userId: "another-user" }),
  ];
  for (const session of cases) assert.equal(await validateMobileDeletionReactivationBearer(bearer(), lookup(session)), null);
});

test("deletion-reactivation authentication rejects non-pending and unverified accounts", async () => {
  for (const status of ["ACTIVE", "SUSPENDED", "DELETED"])
    assert.equal(await validateMobileDeletionReactivationBearer(bearer(), lookup(eligible({}, { status }))), null);
  assert.equal(await validateMobileDeletionReactivationBearer(bearer(), lookup(eligible({}, { email: null }))), null);
  assert.equal(await validateMobileDeletionReactivationBearer(bearer(), lookup(eligible({}, { emailVerified: null }))), null);
});
