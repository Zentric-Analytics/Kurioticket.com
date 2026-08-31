import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isValidAssertionCounter, MOBILE_PASSKEY_CHALLENGE_MS, MOBILE_PASSKEY_CHALLENGE_TYPE } from "./mobilePasskeyAuthentication";

test("mobile passkey challenge and counter rules are strict", () => {
  assert.equal(MOBILE_PASSKEY_CHALLENGE_TYPE, "mobile-passkey-authentication");
  assert.ok(MOBILE_PASSKEY_CHALLENGE_MS <= 5 * 60_000);
  assert.equal(isValidAssertionCounter(0, 0), true);
  assert.equal(isValidAssertionCounter(0, 1), true);
  assert.equal(isValidAssertionCounter(4, 5), true);
  assert.equal(isValidAssertionCounter(4, 4), false);
  assert.equal(isValidAssertionCounter(4, 3), false);
});

test("options are discoverable and reveal no account selector", () => {
  const service = readFileSync("src/services/mobilePasskeyAuthentication.ts", "utf8");
  assert.match(service, /userVerification: "required"/);
  assert.doesNotMatch(service, /allowCredentials/);
  assert.match(service, /expiresAt: new Date\(now\.getTime\(\) \+ MOBILE_PASSKEY_CHALLENGE_MS\)/);
});

test("verification enforces the complete assertion and atomic replay protections", () => {
  const service = readFileSync("src/services/mobilePasskeyAuthentication.ts", "utf8");
  for (const check of ["webauthn.get", "crossOrigin", "assertAllowedOrigin", "rpIdHash", "0x01", "0x04", "verifyAssertionSignature", "userHandle", "revokedAt", "lastUsedAt", "PHISHING_RESISTANT"]) assert.match(service, new RegExp(check));
  assert.match(service, /webAuthnChallenge\.updateMany/);
  assert.match(service, /consumed\.count !== 1/);
  assert.match(service, /userPasskey\.updateMany/);
  assert.match(service, /counter: passkey\.counter/);
});

test("routes rate limit with Retry-After and generic authentication errors", () => {
  const options = readFileSync("src/app/api/mobile/v1/auth/passkey/options/route.ts", "utf8");
  const verify = readFileSync("src/app/api/mobile/v1/auth/passkey/verify/route.ts", "utf8");
  assert.match(options, /request, limit:/);
  assert.match(options, /"Retry-After"/);
  assert.match(verify, /MOBILE_PASSKEY_GENERIC_ERROR/);
  assert.match(verify, /"Retry-After"/);
});
