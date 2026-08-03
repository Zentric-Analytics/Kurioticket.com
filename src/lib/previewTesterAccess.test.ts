import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { canReceiveStagingEmail, canUseStagingCredentials, canUseStagingGoogle, hasPreviewTesterPermission, isActivePreviewTester, isCompanyPreviewEmail, normalizePreviewTesterEmail } from "@/lib/previewTesterAccess";

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

test("normalization and exact company-domain matching reject suffix lookalikes", () => {
  assert.equal(normalizePreviewTesterEmail(" User@ZentricAnalytics.com "), "user@zentricanalytics.com");
  assert.equal(isCompanyPreviewEmail("user@zentricanalytics.com"), true);
  assert.equal(isCompanyPreviewEmail("user@sub.zentricanalytics.com"), false);
  assert.equal(isCompanyPreviewEmail("user@zentricanalytics.com.attacker.test"), false);
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

test("Production access paths return before any PreviewTester database query", async () => {
  production();
  delete process.env.DATABASE_URL;
  assert.equal(await canUseStagingCredentials("customer@example.com"), true);
  assert.equal(await canUseStagingGoogle("customer@example.com"), true);
  assert.equal(await canReceiveStagingEmail("customer@example.com"), true);
});

test("staging email emergency control fails closed unless explicitly enabled", async () => {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  delete process.env.STAGING_EMAIL_DELIVERY_ENABLED;
  assert.equal(await canReceiveStagingEmail("employee@zentricanalytics.com"), false);
  process.env.STAGING_EMAIL_DELIVERY_ENABLED = "true";
  assert.equal(await canReceiveStagingEmail("employee@zentricanalytics.com"), true);
});
