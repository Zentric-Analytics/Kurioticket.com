import assert from "node:assert/strict";
import test from "node:test";
import { permitsWebDeletionRecovery, type RecoveryRequest, type RecoverySession } from "./web-deletion-recovery";

const now = new Date("2030-01-07T12:00:00Z");
const requestedAt = new Date("2030-01-01T12:00:00Z");
export function recoveryFixture() {
  const request: RecoveryRequest = { id: "fixture-deletion", userId: "fixture-owner", status: "PENDING", requestedAt, deletionScheduledAt: new Date("2030-01-08T12:00:00Z"), cancelledAt: null, completedAt: null };
  const session: RecoverySession = {
    id: "fixture-session", userId: request.userId, client: "WEB", sessionVersion: 4,
    createdAt: new Date("2030-01-01T11:00:00Z"), expiresAt: new Date("2030-01-08T12:00:00Z"), revokedAt: requestedAt, revokeReason: "account_deletion_requested",
    authMethod: "PASSWORD", assuranceLevel: "MFA", reauthenticatedAt: new Date("2030-01-01T11:30:00Z"), twoFactorVerifiedAt: new Date("2030-01-01T11:30:00Z"),
    user: { id: request.userId, email: "owner@example.invalid", emailVerified: new Date("2029-01-01"), status: "PENDING_DELETION", sessionVersion: 5, securitySettings: { twoFactorEnabled: true } },
  };
  return { session, request };
}

test("exact deletion-revoked owner/version transition with database MFA is accepted within the grace period", () => {
  const { session, request } = recoveryFixture();
  assert.equal(permitsWebDeletionRecovery(session, request, request.userId, now), true);
  assert.equal(permitsWebDeletionRecovery(session, request, "another-owner", now), false);
});

const invalidSessions: Array<[string, (session: RecoverySession) => void]> = [
  ["expired session", s => { s.expiresAt = now; }],
  ["ordinary revocation", s => { s.revokeReason = "password_changed"; }],
  ["wrong owner", s => { s.userId = "another-owner"; }],
  ["wrong relation owner", s => { s.user.id = "another-owner"; }],
  ["wrong client", s => { s.client = "MOBILE"; }],
  ["wrong version transition", s => { s.sessionVersion = 3; }],
  ["wrong deletion event", s => { s.revokedAt = new Date(requestedAt.getTime() - 1); }],
  ["suspended", s => { s.user.status = "SUSPENDED"; }],
  ["active replay", s => { s.user.status = "ACTIVE"; }],
  ["unverified email", s => { s.user.emailVerified = null; }],
  ["missing email", s => { s.user.email = null; }],
  ["incomplete MFA", s => { s.assuranceLevel = "PRIMARY"; }],
  ["missing MFA proof", s => { s.twoFactorVerifiedAt = null; }],
  ["future MFA proof", s => { s.twoFactorVerifiedAt = new Date("2031-01-01"); }],
  ["MFA proof after revocation", s => { s.twoFactorVerifiedAt = new Date(requestedAt.getTime() + 1); }],
  ["MFA proof predating current enrollment", s => { s.user.securitySettings = { twoFactorEnabled: true, twoFactorEnabledAt: requestedAt }; }],
];
for (const [name, change] of invalidSessions) test(`recovery rejects ${name}`, () => {
  const { session, request } = recoveryFixture(); change(session);
  assert.equal(permitsWebDeletionRecovery(session, request, request.userId, now), false);
});

for (const state of ["CANCELLED", "COMPLETED", "UNKNOWN"]) test(`recovery rejects request state ${state}`, () => {
  const { session, request } = recoveryFixture(); request.status = state;
  assert.equal(permitsWebDeletionRecovery(session, request, request.userId, now), false);
});

test("request ownership, cancellation, completion, deadline and replay are authoritative", () => {
  for (const patch of [{ userId: "another-owner" }, { cancelledAt: now }, { completedAt: now }, { deletionScheduledAt: now }, { requestedAt: new Date("2031-01-01") }]) {
    const { session, request } = recoveryFixture(); Object.assign(request, patch);
    assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), false);
  }
});

test("fresh post-deletion primary sign-in supports recovery throughout the seven-day window without granting active access", () => {
  const { session, request } = recoveryFixture();
  Object.assign(session, { createdAt: new Date(now.getTime() - 60_000), revokedAt: null, revokeReason: null, sessionVersion: 5, assuranceLevel: "PRIMARY", twoFactorVerifiedAt: null, reauthenticatedAt: null });
  session.user.securitySettings = { twoFactorEnabled: false };
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), true);
  session.createdAt = new Date(now.getTime() - 600_001);
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), false);
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now, false), true, "identity refresh is explicitly weaker than recovery authorization");
  session.createdAt = new Date(now.getTime() - 60_000); session.user.securitySettings.twoFactorEnabled = true;
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), false);
});

test("old primary sessions cannot substitute for fresh independent reauthentication", () => {
  const { session, request } = recoveryFixture();
  session.user.securitySettings = null; session.assuranceLevel = "PRIMARY";
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), false);
});

test("verified passkey assurance is accepted; relabelled password assurance is not", () => {
  const { session, request } = recoveryFixture();
  session.authMethod = "PASSKEY"; session.assuranceLevel = "PHISHING_RESISTANT";
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), true);
  session.authMethod = "PASSWORD";
  assert.equal(permitsWebDeletionRecovery(session, request, session.userId, now), false);
});
