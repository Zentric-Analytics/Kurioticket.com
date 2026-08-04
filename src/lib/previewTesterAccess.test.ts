import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";
import { canReceiveStagingEmail, canUseStagingCredentials, canUseStagingGoogle, hasPreviewTesterPermission, isActivePreviewTester, isStagingEmailRecipientAllowed, isStagingGoogleAccessAllowed, isTrustedPreviewCompanyEmail, normalizePreviewTesterEmail } from "@/lib/previewTesterAccess";

const keys = ["TRAVEL_PROVIDER_MODE", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "STAGING_EMAIL_DELIVERY_ENABLED"] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

function production() {
  process.env.TRAVEL_PROVIDER_MODE = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
}

test("normalization and exact trusted-domain matching allow both approved company domains", () => {
  assert.equal(normalizePreviewTesterEmail(" User@ZentricAnalytics.com "), "user@zentricanalytics.com");
  assert.equal(isTrustedPreviewCompanyEmail("admin@kurioticket.com"), true);
  assert.equal(isTrustedPreviewCompanyEmail(" Employee@ZentricAnalytics.com "), true);
});

test("trusted-domain matching rejects Gmail, suffixes, subdomains, and malformed addresses", () => {
  for (const email of [
    "user@gmail.com",
    "user@fakekurioticket.com",
    "user@kurioticket.com.attacker.com",
    "user@sub.kurioticket.com",
    "user@fakezentricanalytics.com",
    "user@zentricanalytics.com.attacker.com",
    "not-an-email",
    "user@@kurioticket.com",
  ]) {
    assert.equal(isTrustedPreviewCompanyEmail(email), false, email);
  }
});

test("active tester evaluation fails closed for suspended, revoked, and expired records", () => {
  const approvedAt = new Date();
  assert.equal(isActivePreviewTester({ status: "ACTIVE", allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: null, approvedAt }), true);
  assert.equal(isActivePreviewTester({ status: "SUSPENDED", allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: null, approvedAt }), false);
  assert.equal(isActivePreviewTester({ status: "REVOKED", allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: null, approvedAt }), false);
  assert.equal(isActivePreviewTester({ status: "ACTIVE", allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: new Date(0), approvedAt }), false);
  assert.equal(isActivePreviewTester({ status: "ACTIVE", allowGoogleSignIn: true, allowStagingEmail: true, expiresAt: null, approvedAt: null }), false);
});

test("active tester permissions are independently enforced", () => {
  const tester = { status: "ACTIVE" as const, allowGoogleSignIn: true, allowStagingEmail: false, expiresAt: null, approvedAt: new Date() };
  assert.equal(hasPreviewTesterPermission(tester, "google"), true);
  assert.equal(hasPreviewTesterPermission(tester, "email"), false);
});

test("staging Google access allows verified company accounts without a tester", () => {
  assert.equal(isStagingGoogleAccessAllowed("admin@kurioticket.com", true, null), true);
  assert.equal(isStagingGoogleAccessAllowed("employee@zentricanalytics.com", true, null), true);
  assert.equal(isStagingGoogleAccessAllowed("admin@kurioticket.com", false, null), false);
});

test("staging Google access requires a valid permitted tester for external accounts", () => {
  const approvedAt = new Date();
  const allowed = { status: "ACTIVE" as const, allowGoogleSignIn: true, allowStagingEmail: false, expiresAt: null, approvedAt };
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, allowed), true);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, { ...allowed, allowGoogleSignIn: false }), false);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, { ...allowed, status: "SUSPENDED" }), false);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, { ...allowed, status: "REVOKED" }), false);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, { ...allowed, expiresAt: new Date(0) }), false);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", true, null), false);
  assert.equal(isStagingGoogleAccessAllowed("tester@gmail.com", false, allowed), false);
});

test("staging email recipients require a trusted domain or explicit tester permission", () => {
  const approvedAt = new Date();
  const allowed = { status: "ACTIVE" as const, allowGoogleSignIn: false, allowStagingEmail: true, expiresAt: null, approvedAt };
  assert.equal(isStagingEmailRecipientAllowed("admin@kurioticket.com", null), true);
  assert.equal(isStagingEmailRecipientAllowed("employee@zentricanalytics.com", null), true);
  assert.equal(isStagingEmailRecipientAllowed("tester@gmail.com", allowed), true);
  assert.equal(isStagingEmailRecipientAllowed("tester@gmail.com", { ...allowed, allowStagingEmail: false }), false);
  assert.equal(isStagingEmailRecipientAllowed("tester@gmail.com", { ...allowed, status: "REVOKED" }), false);
  assert.equal(isStagingEmailRecipientAllowed("tester@gmail.com", null), false);
});

test("Production access paths return before any PreviewTester database query", async () => {
  production();
  delete process.env.DATABASE_URL;
  for (const email of ["customer@gmail.com", "customer@kurioticket.com", "customer@example.com"]) {
    assert.equal(await canUseStagingCredentials(email), true);
    assert.equal(await canUseStagingGoogle(email, true), true);
    assert.equal(await canReceiveStagingEmail(email), true);
  }
});

test("staging email emergency control fails closed unless explicitly enabled", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  delete process.env.STAGING_EMAIL_DELIVERY_ENABLED;
  assert.equal(await canReceiveStagingEmail("employee@zentricanalytics.com"), false);
  assert.equal(await canReceiveStagingEmail("admin@kurioticket.com"), false);
  process.env.STAGING_EMAIL_DELIVERY_ENABLED = "true";
  assert.equal(await canReceiveStagingEmail("employee@zentricanalytics.com"), true);
  assert.equal(await canReceiveStagingEmail("admin@kurioticket.com"), true);
});

test("staging credentials allow only exact trusted company domains", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  assert.equal(await canUseStagingCredentials(" admin@Kurioticket.com "), true);
  assert.equal(await canUseStagingCredentials("employee@zentricanalytics.com"), true);
});

test("staging credentials allow an approved external tester with email permission", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  let lookedUpEmail: string | undefined;
  const allowed = await canUseStagingCredentials(" Approved.Tester@Gmail.com ", async (email) => {
    lookedUpEmail = email;
    return { status: "ACTIVE", allowGoogleSignIn: false, allowStagingEmail: true, expiresAt: null, approvedAt: new Date() };
  });
  assert.equal(allowed, true);
  assert.equal(lookedUpEmail, "approved.tester@gmail.com");
});

test("staging credentials block every ineligible external tester state", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  const approvedAt = new Date();
  const base = { status: "ACTIVE" as const, allowGoogleSignIn: false, allowStagingEmail: true, expiresAt: null, approvedAt };
  const blocked = [
    { ...base, allowStagingEmail: false },
    { ...base, status: "SUSPENDED" as const },
    { ...base, status: "REVOKED" as const },
    { ...base, expiresAt: new Date(Date.now() - 1) },
    { ...base, approvedAt: null },
    null,
  ];

  for (const tester of blocked) {
    assert.equal(await canUseStagingCredentials("tester@gmail.com", async () => tester), false);
  }
});

test("staging credentials reject malformed addresses without querying PreviewTester", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  for (const email of ["not-an-email", "user@@gmail.com"]) {
    assert.equal(await canUseStagingCredentials(email, async () => {
      assert.fail(`must not query malformed address: ${email}`);
    }), false);
  }
  assert.equal(await canUseStagingCredentials("unknown@gmail.com", async () => null), false);
  assert.equal(await canUseStagingCredentials("user@sub.kurioticket.com", async () => null), false);
  assert.equal(await canUseStagingCredentials("user@fakezentricanalytics.com", async () => null), false);
});

test("website, mobile, and session email authentication share the staging credential rule", async () => {
  const consumers = [
    "src/app/api/mobile/v1/auth/request-code/route.ts",
    "src/app/api/mobile/v1/auth/verify-code/route.ts",
    "src/app/api/mobile/v1/auth/password/route.ts",
    "src/app/api/mobile/v1/auth/register/route.ts",
    "src/app/api/auth/request-login-code/route.ts",
    "src/lib/auth.ts",
    "src/services/authService.ts",
  ];

  for (const path of consumers) {
    const source = await readFile(path, "utf8");
    assert.match(source, /canUseStagingCredentials/, path);
  }
  assert.match(await readFile("src/lib/previewTesterAccess.ts", "utf8"), /canRetainStagingSession[\s\S]*canUseStagingCredentials/);
});
