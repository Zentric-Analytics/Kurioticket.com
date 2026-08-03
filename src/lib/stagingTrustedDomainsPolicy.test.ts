import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authSource = readFileSync(new URL("./auth.ts", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");
const accessSource = readFileSync(new URL("./previewTesterAccess.ts", import.meta.url), "utf8");
const mobileGoogleSource = readFileSync(
  new URL("../app/api/mobile/v1/auth/google/route.ts", import.meta.url),
  "utf8",
);

test("web, mobile, and admin authentication share the trusted-domain policy", () => {
  assert.match(authSource, /isTrustedPreviewCompanyEmail\(email\)/);
  assert.match(adminSource, /isTrustedPreviewCompanyEmail\(normalizedEmail\)/);
  assert.match(mobileGoogleSource, /canUseStagingGoogle\(email, payload\.email_verified === true\)/);
});

test("Google company access is evaluated only with provider verification", () => {
  assert.match(authSource, /canUseStagingGoogle\(email, googleVerified\)/);
  assert.match(accessSource, /return googleEmailVerified && hasPreviewTesterPermission/);
});

test("trusted domains are fixed server policy and never derived from request hosts", () => {
  assert.match(accessSource, /"kurioticket\.com"/);
  assert.match(accessSource, /"zentricanalytics\.com"/);
  assert.doesNotMatch(accessSource, /headers|get\("host"\)|x-forwarded-host/i);
});
