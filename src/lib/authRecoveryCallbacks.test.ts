import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { signinSchema } from "./validation";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";

function harness() {
  const user = { id: "fixture-owner", email: "owner@example.invalid", name: "Fixture", image: null, role: "USER", status: "PENDING_DELETION", emailVerified: new Date(), passwordHash: bcrypt.hashSync("FixturePassword123!", 4), accounts: [], securitySettings: { twoFactorEnabled: true } };
  const state = { requestValid: true, allowGoogle: true, recoveryValid: true, assurance: "PRIMARY", created: 0 };
  const db = {
    user: { findUnique: async () => user },
    accountDeletionRequest: { findFirst: async () => state.requestValid ? { id: "fixture-deletion" } : null },
  };
  const modules = {
    "bcryptjs": { default: bcrypt }, "next-auth/providers/credentials": { default: (options: object) => options }, "next-auth/providers/google": { default: () => assert.fail("Google config is not enabled in this fixture") },
    "@next-auth/prisma-adapter": { PrismaAdapter: () => ({}) },
    "@/lib/env": { getAdminEmails: () => [], getAuthSecret: () => "fixture-only", getGoogleClientId: () => "", getGoogleClientSecret: () => "" },
    "@/lib/auth-rate-limit": { AuthRateLimitError: class extends Error {}, checkAuthRateLimit: () => {} },
    "@/lib/auth-diagnostics": { isGoogleAuthConfigured: () => false, logSafeAuthDiagnostics: () => {} },
    "@/lib/prisma": { getPrisma: () => db, isDatabaseConfigured: () => true }, "@/lib/validation": { signinSchema },
    "@/lib/passkeys": { isPasskeyLoginToken: () => false }, "@/lib/stagingSafety": { assertStagingAuthenticationSafety: () => {}, isStagingEnvironment: () => true },
    "@/lib/previewTesterAccess": { canRetainStagingSession: async () => true, canUseStagingCredentials: async () => true, canUseStagingGoogle: async () => state.allowGoogle, isTrustedPreviewCompanyEmail: () => false },
    "@/services/emailVerificationService": { EmailVerificationCooldownError: class extends Error {}, getEmailVerificationRedirect: () => "/auth/verify-email", sendEmailVerificationCode: () => assert.fail("No mail in auth fixture") },
    "@/services/authService": { logAuthEvent: () => {} },
    "@/lib/account-session": { createAccountSession: async () => { state.created++; return { id: "fresh-session", sessionVersion: 5 }; }, validateAccountSession: async () => null },
    "@/lib/web-deletion-recovery": { readWebDeletionRecoverySession: async () => state.recoveryValid ? { id: "fresh-session", sessionVersion: 5, assuranceLevel: state.assurance } : null },
  };
  type AuthUser = typeof user;
  const { authOptions } = loadIsolatedModule<{ authOptions: {
    providers: Array<{ authorize: (credentials: { email: string; password: string }) => Promise<AuthUser | null> }>;
    callbacks: {
      signIn: (args: { user: AuthUser; account?: { provider: string }; profile?: { email_verified: boolean } }) => Promise<boolean | string>;
      jwt: (args: { token: Record<string, unknown>; user?: AuthUser; account?: { provider: string }; trigger?: string; session?: { twoFactorVerified: boolean } }) => Promise<Record<string, unknown>>;
    };
  } }>("src/lib/auth.ts", modules);
  return { options: authOptions, user, state };
}

test("pending-deletion login verifies existing credentials and issues a restricted session instead of cancelling issuance", async () => {
  const h = harness();
  assert.equal(await h.options.providers[0].authorize({ email: h.user.email, password: "wrong" }), null);
  const authenticated = await h.options.providers[0].authorize({ email: h.user.email, password: "FixturePassword123!" });
  assert.ok(authenticated);
  assert.equal(await h.options.callbacks.signIn({ user: h.user, account: { provider: "credentials" } }), true);
  const token = await h.options.callbacks.jwt({ token: {}, user: h.user, account: { provider: "credentials" } });
  assert.equal(h.state.created, 1); assert.equal(token.accountSessionId, "fresh-session");
  assert.equal(token.status, "PENDING_DELETION"); assert.equal(token.twoFactorVerified, false);
  h.state.allowGoogle = false;
  assert.equal(await h.options.callbacks.signIn({ user: h.user, account: { provider: "google" }, profile: { email_verified: true } }), "/auth/signin?error=PreviewAccessRequired");
  h.state.requestValid = false;
  assert.equal(await h.options.callbacks.signIn({ user: h.user }), "/auth/signin?error=AccountUnavailable");
});

test("pending session refresh preserves recovery only through its independent validator; MFA claims cannot self-elevate", async () => {
  const h = harness();
  const token = { id: h.user.id, accountSessionId: "fresh-session", twoFactorVerified: false };
  let refreshed = await h.options.callbacks.jwt({ token: { ...token }, trigger: "update", session: { twoFactorVerified: true } });
  assert.equal(refreshed.twoFactorVerified, false); assert.equal(refreshed.status, "PENDING_DELETION");
  h.state.assurance = "MFA";
  refreshed = await h.options.callbacks.jwt({ token: { ...token }, trigger: "update", session: { twoFactorVerified: true } });
  assert.equal(refreshed.twoFactorVerified, true);
  h.state.recoveryValid = false;
  refreshed = await h.options.callbacks.jwt({ token: { ...token } });
  assert.equal(refreshed.status, "SUSPENDED"); assert.equal(refreshed.twoFactorVerified, false);
  const legacy = await h.options.callbacks.jwt({ token: { id: h.user.id, authMethod: "PASSWORD", assuranceLevel: "PRIMARY" } });
  assert.equal(legacy.status, "SUSPENDED"); assert.equal(legacy.accountSessionId, undefined);
  assert.equal(h.state.created, 0, "refreshing an old cookie cannot manufacture fresh reauthentication");
});
