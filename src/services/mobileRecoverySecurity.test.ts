import assert from "node:assert/strict";
import test from "node:test";
import * as crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { signinSchema } from "../lib/validation";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import type * as mobileModule from "../lib/mobile-deletion-recovery";
import type * as accountModule from "../lib/account-session";
import type * as serviceModule from "./accountDeletionService";
import type * as passkeyModule from "./mobilePasskeyAuthentication";
import type * as passkeyTools from "../lib/passkeys";
import type * as mfaModule from "../lib/mobile-two-factor";
import type { RecoveryRequest, RecoverySession } from "../lib/web-deletion-recovery";

type Row = Omit<RecoverySession, "user"> & { tokenHash: string | null; lastSeenAt: Date };
type Challenge = { id: string; userId: string; authMethod: "PASSWORD" | "GOOGLE"; proofHash: string; expiresAt: Date; consumedAt: Date | null; attempts: number };
type Issued = { token: string; expires: string; recovery?: { deadline: string } };
type SessionApi = {
  issueMobileSession: typeof accountModule.issueMobileSession;
  validateAccountSession: typeof accountModule.validateAccountSession;
  validateMobileBearer: (request: Request) => Promise<Row | null>;
  validateMobileDeletionReactivationBearer: (request: Request) => Promise<(Row & { user: { id: string; email: string }; recoveryDeadline: Date }) | null>;
};

function harness(days = 6) {
  const requestedAt = new Date(Date.now() - days * 86400000);
  const user = { id: "fixture-owner", email: "fixture@example.invalid", name: "Fixture", image: "fixture-image", emailVerified: new Date("2020-01-01"), status: "PENDING_DELETION", sessionVersion: 5, role: "USER", passwordHash: bcrypt.hashSync("FixturePassword123!", 4), accounts: [{ provider: "google", providerAccountId: "fixture-subject" }], securitySettings: { twoFactorEnabled: false, twoFactorEnabledAt: null as Date | null } };
  let deletion: RecoveryRequest = { id: "fixture-request", userId: user.id, status: "PENDING", requestedAt, deletionScheduledAt: addDays(requestedAt, 7), cancelledAt: null, completedAt: null };
  const records = new Map<string, Row>(), challenges = new Map<string, Challenge>();
  const locks: string[] = []; let deliveries = 0, rateChecks = 0, factorValid = true;
  let onLock: (name: string) => void = () => {};
  const join = (row?: Row) => row ? { ...row, user: { ...user, securitySettings: { ...user.securitySettings } } } : null;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => { const sql = strings.join("?"); locks.push(sql); onLock(sql); return []; },
    user: { findUnique: async () => ({ ...user, securitySettings: { ...user.securitySettings } }), update: async ({ data }: { data: { status?: string } }) => { Object.assign(user, data); return user; } },
    accountSession: {
      create: async ({ data }: { data: Partial<Row> & { userId: string } }) => { const row: Row = { id: `fixture-session-${records.size + 1}`, client: "MOBILE", sessionVersion: user.sessionVersion, createdAt: new Date(), expiresAt: addDays(new Date(), 30), revokedAt: null, revokeReason: null, tokenHash: null, authMethod: "PASSWORD", assuranceLevel: "PRIMARY", reauthenticatedAt: null, twoFactorVerifiedAt: null, lastSeenAt: new Date(), ...data }; records.set(row.id, row); return row; },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => { const row = records.get(where.id); assert.ok(row); Object.assign(row, data); return row; },
      findUnique: async ({ where }: { where: { id: string } }) => join(records.get(where.id)),
      findFirst: async ({ where }: { where: { id: string; userId: string; client?: string } }) => { const row = records.get(where.id); return row && row.userId === where.userId && (!where.client || row.client === where.client) ? join(row) : null; },
      updateMany: async () => { throw new Error("Unexpected ordinary last-seen write"); },
    },
    accountDeletionRequest: {
      findFirst: async ({ where }: { where: { userId: string; deletionScheduledAt?: { gt: Date } } }) => where.userId === deletion.userId && ["PENDING", "READY_FOR_REVIEW"].includes(deletion.status) && !deletion.cancelledAt && !deletion.completedAt && (!where.deletionScheduledAt || deletion.deletionScheduledAt > where.deletionScheduledAt.gt) ? { ...deletion } : null,
      findUnique: async () => ({ ...deletion }),
      update: async ({ data }: { data: Partial<RecoveryRequest> }) => { deletion = { ...deletion, ...data }; return deletion; },
    },
    securityEvent: { create: async () => ({}) },
    mobileLoginChallenge: {
      create: async ({ data }: { data: Omit<Challenge, "id" | "consumedAt" | "attempts"> }) => { const row = { ...data, id: `challenge-${challenges.size + 1}`, consumedAt: null, attempts: 0 }; challenges.set(row.id, row); return row; },
      findUnique: async ({ where }: { where: { id: string } }) => challenges.get(where.id) ?? null,
      update: async ({ where }: { where: { id: string } }) => { const row = challenges.get(where.id)!; row.attempts++; return row; },
      updateMany: async ({ where, data }: { where: { id: string; expiresAt: { gt: Date }; attempts: { lt: number } }; data: { consumedAt: Date } }) => { const row = challenges.get(where.id); if (!row || row.consumedAt || row.expiresAt <= where.expiresAt.gt || row.attempts >= where.attempts.lt) return { count: 0 }; row.consumedAt = data.consumedAt; return { count: 1 }; },
    },
    account: { findUnique: async ({ where }: { where: { provider_providerAccountId: { providerAccountId: string } } }) => user.accounts.some(a => a.providerAccountId === where.provider_providerAccountId.providerAccountId) ? { user: { ...user } } : null,
      create: async ({ data }: { data: { provider: string; providerAccountId: string } }) => { user.accounts.push(data); return data; } },
    userSecuritySettings: { findUnique: async () => ({ ...user.securitySettings }) },
  };
  let queue = Promise.resolve();
  const db = { ...tx, $transaction: async <T>(run: (transaction: typeof tx) => Promise<T>) => {
    const prior = queue; let release!: () => void; queue = new Promise<void>(resolve => { release = resolve; }); await prior;
    const beforeUser = structuredClone(user), beforeDeletion = structuredClone(deletion), beforeRecords = structuredClone(records);
    try { return await run(tx); } catch (error) { Object.assign(user, beforeUser); deletion = beforeDeletion; records.clear(); beforeRecords.forEach((r, key) => records.set(key, r)); throw error; } finally { release(); }
  } };
  const lockVisitorAccount = async () => { locks.push("USER LOCK"); onLock("USER LOCK"); return user; };
  const preview = { canRetainStagingSession: async (email: string) => email === user.email };
  const accountPolicy = loadIsolatedModule("src/lib/account-security-policy.ts", { "@/lib/previewTesterAccess": preview });
  const policy = loadIsolatedModule<typeof mobileModule>("src/lib/mobile-deletion-recovery.ts", { "@/lib/prisma": { getPrisma: () => db }, "@/lib/account-security-policy": accountPolicy, "@/lib/previewTesterAccess": preview, "@/services/visitorActivityIdentity": { lockVisitorAccount } });
  const sessions = loadIsolatedModule<SessionApi>("src/lib/account-session.ts", { "node:crypto": crypto, "@/lib/prisma": { getPrisma: () => db }, "@/lib/account-security-policy": accountPolicy, "@/lib/mobile-deletion-recovery": policy });
  const mfa = loadIsolatedModule<typeof mfaModule>("src/lib/mobile-two-factor.ts", { "node:crypto": crypto, "@/lib/prisma": { getPrisma: () => db }, "@/services/twoFactorService": { verifySecondFactor: async () => factorValid }, "@/lib/account-session": sessions, "@/lib/mobile-deletion-recovery": policy });
  const rateLimit = { AuthRateLimitError: class extends Error {}, checkAuthRateLimit: () => { rateChecks++; } };
  const mobileAuth = { createMobileSession: (id: string, method: string, assurance: "PRIMARY" | "MFA", metadata: object, proof: { sessionVersion: number; status: string; verifiedAt?: Date }) => sessions.issueMobileSession(id, method === "google" ? "GOOGLE" : "PASSWORD", assurance, metadata, proof), mobileSessionMetadata: () => ({ platform: "ios" }) };
  const password = loadIsolatedModule<{ POST: (request: Request) => Promise<Response> }>("src/app/api/mobile/v1/auth/password/route.ts", { "bcryptjs": { default: bcrypt }, "next/server": { NextResponse }, "@/lib/auth-rate-limit": rateLimit, "@/lib/validation": { signinSchema }, "@/lib/prisma": { getPrisma: () => db }, "@/lib/mobile-auth": mobileAuth, "@/lib/previewTesterAccess": { canUseStagingCredentials: async () => true }, "@/lib/mobile-two-factor": mfa, "@/lib/mobile-deletion-recovery": policy });
  let googlePayload = { sub: "fixture-subject", email: user.email, email_verified: true, nonce: "a".repeat(64) };
  const google = loadIsolatedModule<{ POST: (request: Request) => Promise<Response> }>("src/app/api/mobile/v1/auth/google/route.ts", { "google-auth-library": { OAuth2Client: class { async verifyIdToken(input: { audience: string }) { assert.equal(input.audience, "fixture-audience"); return { getPayload: () => googlePayload }; } } }, "next/server": { NextResponse }, "@/lib/auth-rate-limit": rateLimit, "@/lib/env": { getMobileGoogleClientId: () => "fixture-audience" }, "@/lib/prisma": { getPrisma: () => db }, "@/lib/mobile-auth": mobileAuth, "@/lib/previewTesterAccess": { canUseStagingGoogle: async () => true }, "@/lib/mobile-two-factor": mfa, "@/lib/mobile-deletion-recovery": policy, "@/lib/mobileGoogleVerificationDiagnostics": { logMobileGoogleClaimsRejected: () => {}, logMobileGoogleVerificationPassed: () => {}, logMobileGoogleVerificationRejected: () => {} } });
  const web = loadIsolatedModule("src/lib/web-deletion-recovery.ts", { "@/lib/prisma": { getPrisma: () => db }, "@/lib/account-session": { RECENT_REAUTHENTICATION_MS: 600000 } });
  const service = loadIsolatedModule<typeof serviceModule>("src/services/accountDeletionService.ts", { "date-fns": { addDays }, "@/lib/env": {}, "@/lib/prisma": { getPrisma: () => db }, "@/services/visitorActivityIdentity": { lockVisitorAccount }, "@/services/emailService": { sendTransactionalEmail: async () => { deliveries++; }, accountDeletionCancelledEmail: () => "fixture-only" }, "@/services/supportService": {}, "@/services/accountNotificationService": { recordAccountEventSafely: async () => {} }, "@/lib/web-deletion-recovery": web, "@/lib/mobile-deletion-recovery": policy });
  const tools = loadIsolatedModule<typeof passkeyTools>("src/lib/passkeys.ts", { crypto, "@/lib/env": { getBaseUrl: () => "https://fixture.invalid" } }, { WEBAUTHN_RP_ID: "fixture.invalid", WEBAUTHN_ORIGINS: "https://fixture.invalid" });
  const passkeys = loadIsolatedModule<typeof passkeyModule>("src/services/mobilePasskeyAuthentication.ts", { zod: { z }, "@/lib/prisma": { getPrisma: () => db }, "@/lib/mobile-deletion-recovery": policy, "@/lib/account-session": sessions, "@/lib/passkeys": tools });
  const post = (path: string, body: object) => new Request(`https://fixture.invalid/${path}`, { method: "POST", body: JSON.stringify(body) });
  const bearer = (token: string) => new Request("https://fixture.invalid/recovery", { headers: { authorization: `Bearer ${token}` } });
  const signIn = async (value = "FixturePassword123!") => password.POST(post("password", { email: user.email, password: value, twoFactorVerified: true, userId: "attacker" }));
  const recover = async (token: string) => { const auth = await sessions.validateMobileDeletionReactivationBearer(bearer(token)); assert.ok(auth?.tokenHash); return service.reactivateAccount(auth.user.id, auth.user.email, undefined, { sessionId: auth.id, tokenHash: auth.tokenHash }); };
  return { user, records, challenges, policy, sessions, mfa, google, passkeys, tools, post, bearer, signIn, recover, service, locks, db,
    get deletion() { return deletion; }, get deliveries() { return deliveries; }, get rateChecks() { return rateChecks; }, setFactor: (v: boolean) => { factorValid = v; },
    setGoogle: (patch: Partial<typeof googlePayload>) => { googlePayload = { ...googlePayload, ...patch }; }, onLock: (run: (name: string) => void) => { onLock = run; } };
}

for (const day of [1, 6]) test(`fresh password recovery on day ${day} issues a permanently ordinary-invalid credential and requires explicit recovery`, async () => {
  const h = harness(day); const response = await h.signIn(); assert.equal(response.status, 200);
  const result = await response.json() as { session: Issued };
  assert.ok(result.session.recovery); assert.match(result.session.token, /^ktm1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(h.user.status, "PENDING_DELETION"); assert.equal(h.deliveries, 0); assert.ok(h.rateChecks > 0);
  assert.equal(await h.sessions.validateMobileBearer(h.bearer(result.session.token)), null);
  assert.equal((await h.recover(result.session.token)).status, "CANCELLED"); assert.equal(h.user.status, "ACTIVE");
  assert.equal(await h.sessions.validateMobileBearer(h.bearer(result.session.token)), null, "restoration must not promote the recovery bearer");
  assert.equal(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(result.session.token)), null);
  const normal = await (await h.signIn()).json() as { session: Issued }; assert.equal(normal.session.recovery, undefined);
  assert.ok(await h.sessions.validateMobileBearer(h.bearer(normal.session.token)));
});

test("expired original credentials do not prevent fresh day-six authentication; stale PRIMARY and client MFA flags never authorize", async () => {
  const h = harness(); const seed = await (await h.signIn()).json() as { session: Issued };
  const row = [...h.records.values()][0]; row.expiresAt = new Date(0);
  assert.equal(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(seed.session.token)), null);
  const fresh = await (await h.signIn()).json() as { session: Issued };
  assert.ok(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(fresh.session.token)));
  const current = [...h.records.values()].at(-1)!;
  current.revokeReason = "account_deletion_requested"; current.revokedAt = h.deletion.requestedAt; current.sessionVersion = 4; current.createdAt = new Date(h.deletion.requestedAt.getTime() - 86400000); current.reauthenticatedAt = null;
  assert.equal(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(fresh.session.token)), null);
  h.user.securitySettings.twoFactorEnabled = true;
  const challenge = await h.signIn(); assert.equal(challenge.status, 202); assert.equal(h.records.size, 2, "forged request MFA does not issue a session");
});

test("password failure, suspended account, cancelled/completed/expired requests fail without issuance", async () => {
  const h = harness(); assert.equal((await h.signIn("wrong")).status, 401); assert.equal(h.records.size, 0);
  for (const state of ["SUSPENDED", "DELETED"]) { h.user.status = state; assert.equal((await h.signIn()).status, 401); }
  h.user.status = "PENDING_DELETION";
  for (const state of ["CANCELLED", "COMPLETED"]) { h.deletion.status = state; assert.equal((await h.signIn()).status, 401); }
  h.deletion.status = "PENDING"; h.deletion.deletionScheduledAt = new Date(0);
  assert.equal((await h.signIn()).status, 401); assert.equal(h.records.size, 0);
});

test("Google recovery requires the verified nonce/email/subject binding and retains ACTIVE behavior", async () => {
  const h = harness(); const login = () => h.google.POST(h.post("google", { idToken: "controlled-provider-proof", nonce: "a".repeat(64), email: "attacker@example.invalid" }));
  let response = await login(); assert.equal(response.status, 200); assert.ok((await response.json()).session.recovery);
  h.setGoogle({ nonce: "b".repeat(64) }); assert.equal((await login()).status, 401);
  h.setGoogle({ nonce: "a".repeat(64), email: "attacker@example.invalid" }); assert.notEqual((await login()).status, 200);
  h.setGoogle({ email: h.user.email, sub: "different-subject" }); assert.notEqual((await login()).status, 200);
  h.setGoogle({ sub: "fixture-subject" }); h.user.status = "ACTIVE";
  response = await login(); assert.equal(response.status, 200); assert.equal((await response.json()).session.recovery, undefined);
});

test("a verified unlinked Google owner retains the existing email-linking path without replacing an established different subject", async () => {
  const h = harness(); h.user.accounts.length = 0;
  const response = await h.google.POST(h.post("google", { idToken: "controlled-provider-proof", nonce: "a".repeat(64) }));
  assert.equal(response.status, 200); assert.ok((await response.json()).session.recovery);
  assert.equal(h.user.accounts[0].providerAccountId, "fixture-subject");
});

test("restricted issuance requires independent proof and rechecks lifecycle/MFA/deadline under locks", async () => {
  const noProof = harness(); await assert.rejects(noProof.sessions.issueMobileSession(noProof.user.id, "PASSWORD", "PRIMARY")); assert.equal(noProof.records.size, 0);
  for (const kind of ["version", "MFA", "deadline", "cancelled"]) {
    const h = harness();
    h.onLock(sql => {
      if (kind === "version" && sql === "USER LOCK") h.user.sessionVersion++;
      if (kind === "MFA" && sql === "USER LOCK") h.user.securitySettings.twoFactorEnabled = true;
      if (kind === "deadline" && sql.includes('"AccountDeletionRequest"')) h.deletion.deletionScheduledAt = new Date(0);
      if (kind === "cancelled" && sql.includes('"AccountDeletionRequest"')) h.deletion.cancelledAt = new Date();
    });
    assert.equal((await h.signIn()).status, 503); assert.equal(h.records.size, 0);
  }
});

test("auth/session recognizes only restricted recovery access and refuses it after account restoration", async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued };
  const api = loadIsolatedModule<{ GET: (request: Request) => Promise<Response> }>("src/app/api/mobile/v1/auth/session/route.ts", { "next/server": { NextResponse }, "@/lib/mobile-auth": { getMobileSession: h.sessions.validateMobileBearer }, "@/lib/account-session": h.sessions });
  const response = await api.GET(h.bearer(result.session.token)); assert.equal(response.status, 200);
  const body = await response.json(); assert.deepEqual(body.recovery, result.session.recovery);
  assert.deepEqual(Object.keys(body.user).sort(), ["email", "id", "name"]);
  await h.recover(result.session.token);
  assert.equal((await api.GET(h.bearer(result.session.token))).status, 401);
});

test("MFA recovery uses current persisted proof; invalid/replayed or lifecycle-stale challenges cannot issue credentials", async () => {
  const h = harness(); h.user.securitySettings.twoFactorEnabled = true;
  const challenge = await (await h.signIn()).json() as { challengeToken: string };
  assert.equal(h.records.size, 0); h.setFactor(false);
  assert.ok("error" in await h.mfa.completeMobileTwoFactorChallenge(challenge.challengeToken, "invalid")); assert.equal(h.records.size, 0);
  h.setFactor(true);
  const complete = await h.mfa.completeMobileTwoFactorChallenge(challenge.challengeToken, "fixture-verified-code"); assert.ok("session" in complete && complete.session); assert.ok(complete.session.recovery);
  const token = complete.session.token; assert.ok(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(token)));
  assert.ok("error" in await h.mfa.completeMobileTwoFactorChallenge(challenge.challengeToken, "fixture-verified-code"));
  [...h.records.values()][0].assuranceLevel = "PRIMARY";
  assert.equal(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(token)), null);
  const next = await (await h.signIn()).json() as { challengeToken: string }; h.user.sessionVersion++;
  assert.ok("error" in await h.mfa.completeMobileTwoFactorChallenge(next.challengeToken, "fixture-verified-code"));
});

test("fresh passkey recovery executes real signature, RP, UV, owner and replay checks", async () => {
  const h = harness(); h.user.securitySettings.twoFactorEnabled = true;
  const challenge = h.tools.b64url(crypto.randomBytes(32)), credentialId = h.tools.b64url(crypto.randomBytes(32));
  const keys = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const clientDataJSON = h.tools.b64url(Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin: "https://fixture.invalid" })));
  const bytes = Buffer.alloc(37); h.tools.sha256("fixture.invalid").copy(bytes); bytes[32] = 0x05; bytes.writeUInt32BE(1, 33);
  const signature = h.tools.b64url(crypto.sign("SHA256", Buffer.concat([bytes, h.tools.sha256(Buffer.from(clientDataJSON, "base64url"))]), keys.privateKey));
  const assertion = { id: credentialId, rawId: credentialId, type: "public-key", response: { clientDataJSON, authenticatorData: h.tools.b64url(bytes), signature, userHandle: h.tools.userHandle(h.user.id) } };
  let consumed = false;
  const passkey = { id: "fixture-passkey", userId: h.user.id, user: h.user, counter: 0, revokedAt: null, publicKey: JSON.stringify(keys.publicKey.export({ format: "jwk" })) };
  const db = { ...h.db,
    webAuthnChallenge: { findUnique: async () => ({ id: "fixture-assertion", type: "mobile-passkey-authentication", consumedAt: consumed ? new Date() : null, expiresAt: new Date(Date.now() + 60000) }) },
    userPasskey: { findUnique: async () => passkey },
    $transaction: async (run: (tx: object) => Promise<void>) => run({ webAuthnChallenge: { updateMany: async () => { if (consumed) return { count: 0 }; consumed = true; return { count: 1 }; } }, userPasskey: { updateMany: async () => ({ count: 1 }) } }),
  };
  const options = { prisma: db as never, canAuthenticate: h.policy.canAuthenticateMobileAccount, issueSession: h.sessions.issueMobileSession };
  await assert.rejects(h.passkeys.verifyMobilePasskeyAssertion({ ...assertion, response: { ...assertion.response, userHandle: h.tools.userHandle("wrong-owner") } }, options));
  const result = await h.passkeys.verifyMobilePasskeyAssertion(assertion, options); assert.ok(result.session.recovery);
  assert.equal([...h.records.values()][0].assuranceLevel, "PHISHING_RESISTANT");
  assert.ok(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(result.session.token)));
  await assert.rejects(h.passkeys.verifyMobilePasskeyAssertion(assertion, options));
});

for (const condition of ["version", "MFA", "owner", "deadline", "request-cancelled", "session-expired", "hash", "enrollment"] as const) test(`recovery revalidates ${condition} after session-lock waits`, async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued };
  const auth = await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(result.session.token)); assert.ok(auth?.tokenHash);
  h.onLock(sql => { if (!sql.includes('"AccountSession"')) return; const row = [...h.records.values()][0];
    if (condition === "version") h.user.sessionVersion++;
    if (condition === "MFA") h.user.securitySettings.twoFactorEnabled = true;
    if (condition === "owner") row.userId = "attacker";
    if (condition === "deadline") h.deletion.deletionScheduledAt = new Date(0);
    if (condition === "request-cancelled") h.deletion.cancelledAt = new Date();
    if (condition === "session-expired") row.expiresAt = new Date(0);
    if (condition === "hash") row.tokenHash = "replaced";
    if (condition === "enrollment") { h.user.securitySettings.twoFactorEnabled = true; h.user.securitySettings.twoFactorEnabledAt = new Date(Date.now() + 1); }
  });
  await assert.rejects(h.service.reactivateAccount(auth.user.id, auth.user.email, undefined, { sessionId: auth.id, tokenHash: auth.tokenHash }));
  assert.equal(h.user.status, "PENDING_DELETION"); assert.equal(h.deliveries, 0);
});

test("concurrent explicit recovery succeeds exactly once and never restores the recovery credential", async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued };
  const auth = await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(result.session.token)); assert.ok(auth?.tokenHash);
  const run = () => h.service.reactivateAccount(auth.user.id, auth.user.email, undefined, { sessionId: auth.id, tokenHash: auth.tokenHash! });
  const results = await Promise.allSettled([run(), run()]); assert.equal(results.filter(r => r.status === "fulfilled").length, 1); assert.equal(h.deliveries, 1);
  assert.equal(await h.sessions.validateMobileBearer(h.bearer(result.session.token)), null);
  assert.ok(h.locks.findIndex(x => x.includes('"AccountDeletionRequest"')) < h.locks.findIndex(x => x.includes('"AccountSession"')));
});

for (const kind of ["wrong-version", "wrong-owner", "wrong-client", "unrelated-revocation", "expired", "cancelled", "completed", "suspended", "forged-MFA", "missing-MFA-timestamp"] as const) test(`restricted credential rejects ${kind}`, async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued };
  const row = [...h.records.values()][0];
  if (kind === "wrong-version") row.sessionVersion--;
  if (kind === "wrong-owner") row.userId = "other";
  if (kind === "wrong-client") row.client = "WEB";
  if (kind === "unrelated-revocation") row.revokeReason = "password_changed";
  if (kind === "expired") row.expiresAt = new Date(0);
  if (kind === "cancelled") h.deletion.cancelledAt = new Date();
  if (kind === "completed") h.deletion.completedAt = new Date();
  if (kind === "suspended") h.user.status = "SUSPENDED";
  if (kind === "forged-MFA") h.user.securitySettings.twoFactorEnabled = true;
  if (kind === "missing-MFA-timestamp") { h.user.securitySettings.twoFactorEnabled = true; row.assuranceLevel = "MFA"; row.twoFactorVerifiedAt = null; }
  assert.equal(await h.sessions.validateMobileDeletionReactivationBearer(h.bearer(result.session.token)), null);
  assert.equal(h.user.status === "ACTIVE", false); assert.equal(h.deliveries, 0);
});

test("restricted credentials cannot satisfy ordinary mobile, canonical web or admin guards, even after recovery", async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued }; const row = [...h.records.values()][0];
  const mobile = loadIsolatedModule<{ requireMobileSecurity: (r: Request) => Promise<unknown> }>("src/lib/mobile-security-route.ts", { "next/server": { NextResponse }, "@/lib/mobile-auth": { getMobileSession: h.sessions.validateMobileBearer } });
  const web = loadIsolatedModule<{ requireWebApiSession: () => Promise<unknown> }>("src/lib/web-api-auth.ts", {
    "next-auth": { getServerSession: async () => ({ user: { ...h.user, role: "ADMIN", accountSessionId: row.id } }) }, "@/lib/auth": { authOptions: {} }, "@/lib/account-session": h.sessions,
  });
  const admin = loadIsolatedModule<{ requireAdminApiSession: () => Promise<{ response: Response }> }>("src/lib/admin.ts", { "next/server": { NextResponse }, "@/lib/web-api-auth": web, "@/lib/auth-diagnostics": { logSafeAuthDiagnostics: () => {} }, "@/lib/env": {}, "@/lib/prisma": {}, "@/lib/previewTesterAccess": {}, "@/lib/stagingSafety": {} });
  for (const stage of ["PENDING_DELETION", "ACTIVE"]) {
    h.user.status = stage;
    assert.equal(await mobile.requireMobileSecurity(h.bearer(result.session.token)), null);
    assert.equal(await web.requireWebApiSession(), null);
    assert.equal((await admin.requireAdminApiSession()).response.status, 403);
  }
});

test("the recovery route requires explicit confirmation and transaction-bound proof; login/status never recover automatically", async () => {
  const h = harness(); const result = await (await h.signIn()).json() as { session: Issued };
  const api = loadIsolatedModule<{ createReactivateHandler: (deps: object) => (request: Request) => Promise<Response> }>("src/app/api/mobile/v1/security/deletion-request/reactivate/route.ts", { "next/server": { NextResponse }, zod: { z }, "@/lib/account-session": h.sessions, "@/lib/mobile-security-route": { mobileUnauthorized: () => NextResponse.json({}, { status: 401 }) }, "@/services/accountDeletionService": h.service });
  const handler = api.createReactivateHandler({ authenticate: h.sessions.validateMobileDeletionReactivationBearer, reactivate: h.service.reactivateAccount });
  const request = (body: object) => new Request("https://fixture.invalid/recovery", { method: "POST", headers: { authorization: `Bearer ${result.session.token}` }, body: JSON.stringify(body) });
  assert.equal((await handler(request({ confirmed: false }))).status, 400); assert.equal(h.user.status, "PENDING_DELETION");
  assert.equal((await handler(request({ userId: h.user.id }))).status, 400); assert.equal(h.deliveries, 0);
  assert.equal((await handler(request({ confirmed: true, userId: "attacker", twoFactorVerified: true }))).status, 200);
  assert.equal(h.deliveries, 1); assert.equal((await handler(request({ confirmed: true }))).status, 401);
});

test("MFA challenge expiry, invalid proof, maximum attempts and request cancellation are enforced", async () => {
  for (const scenario of ["expired", "invalid-proof", "attempts", "cancelled"]) {
    const h = harness(); h.user.securitySettings.twoFactorEnabled = true;
    const issued = await (await h.signIn()).json() as { challengeToken: string };
    const challenge = [...h.challenges.values()][0]; let token = issued.challengeToken;
    if (scenario === "expired") challenge.expiresAt = new Date(0);
    if (scenario === "invalid-proof") token = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    if (scenario === "attempts") challenge.attempts = 5;
    if (scenario === "cancelled") h.deletion.cancelledAt = new Date();
    assert.ok("error" in await h.mfa.completeMobileTwoFactorChallenge(token, "fixture-code")); assert.equal(h.records.size, 0);
  }
});

test("completed MFA recovery still requires a new ordinary MFA sign-in after restoration", async () => {
  const h = harness(); h.user.securitySettings.twoFactorEnabled = true;
  const first = await (await h.signIn()).json() as { challengeToken: string };
  const recovery = await h.mfa.completeMobileTwoFactorChallenge(first.challengeToken, "fixture-code"); assert.ok("session" in recovery && recovery.session);
  await h.recover(recovery.session.token);
  assert.equal(await h.sessions.validateMobileBearer(h.bearer(recovery.session.token)), null);
  const secondResponse = await h.signIn(); assert.equal(secondResponse.status, 202);
  const second = await secondResponse.json() as { challengeToken: string };
  const ordinary = await h.mfa.completeMobileTwoFactorChallenge(second.challengeToken, "fixture-code"); assert.ok("session" in ordinary && ordinary.session);
  assert.equal(ordinary.session.recovery, undefined);
  assert.ok(await h.sessions.validateMobileBearer(h.bearer(ordinary.session.token)));
});
