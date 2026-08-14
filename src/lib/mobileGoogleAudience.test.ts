import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test, { afterEach } from "node:test";
import { getGoogleClientId, getGoogleClientSecret, getMobileGoogleClientId } from "./env";

const trackedEnvironment = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MOBILE_GOOGLE_WEB_CLIENT_ID",
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_URL",
  "TRAVEL_PROVIDER_MODE",
] as const;
const originalEnvironment = Object.fromEntries(trackedEnvironment.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of trackedEnvironment) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("website and mobile Google audiences resolve independently", () => {
  process.env.GOOGLE_CLIENT_ID = "website-client-A";
  process.env.GOOGLE_CLIENT_SECRET = "website-secret-A";
  process.env.MOBILE_GOOGLE_WEB_CLIENT_ID = "mobile-client-B";
  process.env.TRAVEL_PROVIDER_MODE = "staging";

  assert.equal(getGoogleClientId(), "website-client-A");
  assert.equal(getGoogleClientSecret(), "website-secret-A");
  assert.equal(getMobileGoogleClientId(), "mobile-client-B");
});

test("staging mobile verification fails closed without its explicit audience", () => {
  process.env.GOOGLE_CLIENT_ID = "working-website-client";
  delete process.env.MOBILE_GOOGLE_WEB_CLIENT_ID;
  process.env.NEXTAUTH_URL = "https://staging.kurioticket.com";

  assert.equal(getGoogleClientId(), "working-website-client");
  assert.equal(getMobileGoogleClientId(), "");
});

test("non-staging temporarily retains the legacy website-client fallback", () => {
  process.env.GOOGLE_CLIENT_ID = "production-legacy-client";
  delete process.env.MOBILE_GOOGLE_WEB_CLIENT_ID;
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.TRAVEL_PROVIDER_MODE = "production";

  assert.equal(getMobileGoogleClientId(), "production-legacy-client");
});

test("website NextAuth remains on website helpers and mobile route uses the dedicated audience", () => {
  const webAuth = readFileSync(resolve(process.cwd(), "src/lib/auth.ts"), "utf8");
  const mobileRoute = readFileSync(resolve(process.cwd(), "src/app/api/mobile/v1/auth/google/route.ts"), "utf8");

  assert.match(webAuth, /getGoogleClientId\(\)/);
  assert.match(webAuth, /getGoogleClientSecret\(\)/);
  assert.match(mobileRoute, /getMobileGoogleClientId\(\)/);
  assert.doesNotMatch(mobileRoute, /getGoogleClientId\(\)/);
});

test("verification and nonce checks remain ahead of Preview policy and session issuance", () => {
  const route = readFileSync(resolve(process.cwd(), "src/app/api/mobile/v1/auth/google/route.ts"), "utf8");
  const verification = route.indexOf("verifyIdToken");
  const nonce = route.indexOf("payload.nonce !== nonce");
  const previewPolicy = route.indexOf("canUseStagingGoogle(", nonce);
  const previewRejection = route.indexOf("PREVIEW_ACCESS_REQUIRED", previewPolicy);
  const accountLinking = route.indexOf("getOrCreateGoogleUser({", previewRejection);
  const twoFactor = route.indexOf("createMobileTwoFactorChallenge(", accountLinking);
  const session = route.indexOf("createMobileSession(", twoFactor);

  assert.ok(verification > -1 && nonce > verification);
  assert.ok(previewPolicy > nonce && previewRejection > previewPolicy);
  assert.ok(accountLinking > previewRejection);
  assert.ok(twoFactor > accountLinking && session > twoFactor);
});
