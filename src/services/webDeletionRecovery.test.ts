import assert from "node:assert/strict";
import test from "node:test";
import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import { RECENT_REAUTHENTICATION_MS } from "../lib/account-session";
import type { RecoveryRequest, RecoverySession } from "../lib/web-deletion-recovery";
import type * as recoveryModule from "../lib/web-deletion-recovery";
import type * as serviceModule from "./accountDeletionService";

function harness() {
  const requestedAt = new Date(Date.now() - 60_000);
  let request: RecoveryRequest = { id: "deletion-fixture", userId: "owner-fixture", status: "PENDING", requestedAt, deletionScheduledAt: addDays(requestedAt, 7), cancelledAt: null, completedAt: null };
  let session: RecoverySession = {
    id: "session-fixture", userId: request.userId, client: "WEB", sessionVersion: 4, createdAt: new Date(requestedAt.getTime() - 60_000), expiresAt: addDays(new Date(), 1), revokedAt: requestedAt, revokeReason: "account_deletion_requested", authMethod: "PASSWORD", assuranceLevel: "MFA", reauthenticatedAt: new Date(requestedAt.getTime() - 30_000), twoFactorVerifiedAt: new Date(requestedAt.getTime() - 30_000),
    user: { id: request.userId, email: "owner@example.invalid", emailVerified: requestedAt, status: "PENDING_DELETION", sessionVersion: 5, securitySettings: { twoFactorEnabled: true } },
  };
  const events: string[] = []; let mails = 0; let notifications = 0; let writes = 0;
  let onSessionLock = () => {};
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => { const sql = strings.join("?"); events.push(sql); if (sql.includes('"AccountSession"')) onSessionLock(); },
    accountSession: { findFirst: async (args: { where: { id: string; userId: string; client: string } }) => {
      events.push("read-session"); return args.where.id === session.id && args.where.userId === session.userId && args.where.client === session.client ? session : null;
    } },
    accountDeletionRequest: {
      findFirst: async () => request,
      findUnique: async () => request,
      update: async ({ data }: { data: Partial<RecoveryRequest> }) => { writes++; request = { ...request, ...data }; return request; },
    },
    user: { update: async ({ data }: { data: { status: string } }) => { writes++; session = { ...session, user: { ...session.user, status: data.status } }; } },
  };
  let queue = Promise.resolve();
  const db = { ...tx, $transaction: async <T>(run: (transaction: typeof tx) => Promise<T>): Promise<T> => {
    const previous = queue; let release!: () => void; queue = new Promise<void>(resolve => { release = resolve; }); await previous;
    const priorSession = structuredClone(session), priorRequest = structuredClone(request);
    try { return await run(tx); } catch (error) { session = priorSession; request = priorRequest; throw error; } finally { release(); }
  } };
  const recovery = loadIsolatedModule<typeof recoveryModule>("src/lib/web-deletion-recovery.ts", { "@/lib/prisma": { getPrisma: () => db }, "@/lib/account-session": { RECENT_REAUTHENTICATION_MS } });
  const mobile = loadIsolatedModule("src/lib/mobile-deletion-recovery.ts", { "@/lib/prisma": { getPrisma: () => db }, "@/lib/account-security-policy": {}, "@/lib/previewTesterAccess": {}, "@/services/visitorActivityIdentity": {} });
  const api = loadIsolatedModule<typeof serviceModule>("src/services/accountDeletionService.ts", {
    "date-fns": { addDays }, "@/lib/env": {}, "@/lib/prisma": { getPrisma: () => db },
    "@/services/visitorActivityIdentity": { lockVisitorAccount: async () => { events.push("lock-user"); return session.user; } },
    "@/services/emailService": { sendTransactionalEmail: async () => { mails++; }, accountDeletionCancelledEmail: () => "fixture-only" },
    "@/services/supportService": {}, "@/services/accountNotificationService": { recordAccountEventSafely: async () => { notifications++; } }, "@/lib/web-deletion-recovery": recovery, "@/lib/mobile-deletion-recovery": mobile,
  });
  return { api, events, afterSessionLock: (run: () => void) => { onSessionLock = run; }, get request() { return request; }, get session() { return session; }, get writes() { return writes; }, deliveries: () => ({ mails, notifications }) };
}

test("actual service authorizes the owner under account, deletion-request and session locks", async () => {
  const h = harness();
  const result = await h.api.reactivateAccount(h.session.userId, h.session.user.email!, h.session.id);
  assert.equal(result.status, "CANCELLED"); assert.equal(h.session.user.status, "ACTIVE");
  assert.equal(h.events[0], "lock-user");
  assert.ok(h.events[1].includes('"AccountDeletionRequest"') && h.events[1].includes("FOR UPDATE"));
  assert.ok(h.events[2].includes('"AccountSession"') && h.events[2].includes("FOR UPDATE"));
  assert.equal(h.events[3], "read-session");
  assert.deepEqual(h.deliveries(), { mails: 1, notifications: 1 });
  await assert.rejects(h.api.reactivateAccount(h.session.userId, h.session.user.email!, h.session.id));
  assert.deepEqual(h.deliveries(), { mails: 1, notifications: 1 });
});

test("concurrent recovery attempts serialize, succeed once and cannot replay delivery", async () => {
  const h = harness(); const run = () => h.api.reactivateAccount(h.session.userId, h.session.user.email!, h.session.id);
  const results = await Promise.allSettled([run(), run()]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
  assert.deepEqual(h.deliveries(), { mails: 1, notifications: 1 });
});

test("fresh post-deletion primary authentication can recover a non-MFA account through the actual service", async () => {
  const h = harness();
  Object.assign(h.session, { createdAt: new Date(), revokedAt: null, revokeReason: null, sessionVersion: 5, assuranceLevel: "PRIMARY", twoFactorVerifiedAt: null, reauthenticatedAt: null });
  h.session.user.securitySettings = { twoFactorEnabled: false };
  assert.equal((await h.api.reactivateAccount(h.session.userId, h.session.user.email!, h.session.id)).status, "CANCELLED");
});

test("mobile service callers must supply transaction-bound recovery authorization", async () => {
  const h = harness(); h.session.client = "MOBILE";
  await assert.rejects(h.api.reactivateAccount(h.session.userId, h.session.user.email!));
  assert.equal(h.writes, 0); assert.deepEqual(h.deliveries(), { mails: 0, notifications: 0 });
});

test("deadline or version drift while waiting for the session lock is revalidated before any mutation", async () => {
  for (const change of ["deadline", "version"]) {
    const h = harness();
    h.afterSessionLock(() => {
      if (change === "deadline") h.request.deletionScheduledAt = new Date(0);
      else h.session.user.sessionVersion++;
    });
    await assert.rejects(h.api.reactivateAccount(h.session.userId, h.session.user.email!, h.session.id));
    assert.equal(h.writes, 0); assert.deepEqual(h.deliveries(), { mails: 0, notifications: 0 });
  }
});

for (const scenario of ["cancelled", "completed", "expired", "wrong-request-owner", "wrong-session", "wrong-email", "MFA", "version", "revoked", "suspended"] as const) {
  test(`locked service rejects ${scenario} without mutations or deliveries`, async () => {
    const h = harness(); let id = h.session.id, email = h.session.user.email!;
    if (scenario === "cancelled") h.request.cancelledAt = new Date();
    if (scenario === "completed") h.request.completedAt = new Date();
    if (scenario === "expired") h.request.deletionScheduledAt = new Date(0);
    if (scenario === "wrong-request-owner") h.request.userId = "other";
    if (scenario === "wrong-session") id = "other";
    if (scenario === "wrong-email") email = "other@example.invalid";
    if (scenario === "MFA") h.session.assuranceLevel = "PRIMARY";
    if (scenario === "version") h.session.sessionVersion = 3;
    if (scenario === "revoked") h.session.revokeReason = "password_changed";
    if (scenario === "suspended") h.session.user.status = "SUSPENDED";
    await assert.rejects(h.api.reactivateAccount(h.session.userId, email, id));
    assert.equal(h.writes, 0); assert.deepEqual(h.deliveries(), { mails: 0, notifications: 0 });
  });
}

test("web route requires canonical identity, same-origin intent and forwards the session id; failures reveal no request state", async () => {
  let session: { user: { id: string; email: string; accountSessionId: string; status: string; emailVerified: boolean } } | null = null;
  let failure = "RecoveryAuthorizationRequired"; let calls = 0;
  const route = loadIsolatedModule<{ POST: (request: Request) => Promise<Response> }>("src/app/api/account/security/deletion-request/reactivate/route.ts", {
    "next/server": { NextResponse }, "next-auth": { getServerSession: async () => session }, "@/lib/auth": { authOptions: {} }, "@/lib/env": { getBaseUrl: () => "https://fixture.invalid" },
    "@/services/accountDeletionService": { reactivateAccount: async (...args: string[]) => { calls++; assert.deepEqual(args, ["owner", "owner@example.invalid", "session"]); throw new Error(failure); } },
  });
  const request = (origin = "https://fixture.invalid") => new Request("https://fixture.invalid/api/account/security/deletion-request/reactivate", { method: "POST", headers: { origin } });
  assert.equal((await route.POST(request())).status, 401); assert.equal(calls, 0);
  session = { user: { id: "owner", email: "owner@example.invalid", accountSessionId: "session", status: "PENDING_DELETION", emailVerified: true } };
  session.user.status = "SUSPENDED";
  assert.equal((await route.POST(request())).status, 403); assert.equal(calls, 0);
  session.user.status = "PENDING_DELETION";
  assert.equal((await route.POST(request("https://attacker.invalid"))).status, 403); assert.equal(calls, 0);
  for (failure of ["RecoveryAuthorizationRequired", "NoPendingRequest", "GracePeriodExpired", "AccountUnavailable"]) {
    const response = await route.POST(request());
    assert.equal(response.status, 403); assert.deepEqual(await response.json(), { error: "Unable to authorize account recovery." });
  }
});

test("the existing MFA endpoint verifies the second factor before upgrading the exact unrevoked recovery session", async () => {
  let verified = false; const updates: unknown[] = [];
  class RateLimitError extends Error {}
  const endpoint = loadIsolatedModule<{ POST: (request: Request) => Promise<Response> }>("src/app/api/auth/two-factor/confirm/route.ts", {
    "next/server": { NextResponse }, "next-auth": { getServerSession: async () => ({ user: { id: "owner", email: "owner@example.invalid", accountSessionId: "fresh-recovery-session", status: "PENDING_DELETION" } }) },
    "zod": { z }, "@/lib/auth": { authOptions: {} }, "@/lib/auth-rate-limit": { AuthRateLimitError: RateLimitError, checkAuthRateLimit: () => {} },
    "@/services/twoFactorService": { verifySecondFactor: async (input: { userId: string; code: string }) => { assert.deepEqual(input, { userId: "owner", code: "123456" }); return verified; } },
    "@/lib/prisma": { getPrisma: () => ({ accountSession: { updateMany: async (input: { where: { id: string; userId: string; revokedAt: null; expiresAt: { gt: Date } }; data: { assuranceLevel: string; twoFactorVerifiedAt: Date; reauthenticatedAt: Date } }) => {
      assert.equal(input.where.id, "fresh-recovery-session"); assert.equal(input.where.userId, "owner"); assert.equal(input.where.revokedAt, null);
      assert.ok(input.where.expiresAt.gt instanceof Date); assert.equal(input.data.assuranceLevel, "MFA"); updates.push(input); return { count: 1 };
    } } }) },
  });
  const request = () => new Request("https://fixture.invalid/api/auth/two-factor/confirm", { method: "POST", body: JSON.stringify({ code: "123456" }) });
  assert.equal((await endpoint.POST(request())).status, 400); assert.equal(updates.length, 0);
  verified = true;
  assert.equal((await endpoint.POST(request())).status, 200); assert.equal(updates.length, 1);
});
