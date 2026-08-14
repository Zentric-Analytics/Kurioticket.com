import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  formatNativeGoogleError,
  GENERIC_GOOGLE_ERROR,
  getNativeGoogleErrorCode,
} from "./googleSignInDiagnostics";

test("Production Google failures retain the generic safe message", () => {
  const message = formatNativeGoogleError({
    error: { code: "IOS_FAILURE", message: "provider detail" },
    isPreview: false,
    operation: "signIn",
    platform: "ios",
  });

  assert.equal(message, GENERIC_GOOGLE_ERROR);
  assert.doesNotMatch(message, /IOS_FAILURE|provider detail/);
});

test("Preview exposes allowlisted native metadata and the failing operation", () => {
  const message = formatNativeGoogleError({
    error: { code: "-5", name: "GIDSignInError", domain: "com.google.GIDSignIn", message: "Callback failed" },
    isPreview: true,
    operation: "presentExplicitSignIn",
    platform: "ios",
  });

  assert.match(message, /ios: presentExplicitSignIn; code=-5/);
  assert.match(message, /name=GIDSignInError/);
  assert.match(message, /domain=com.google.GIDSignIn/);
  assert.match(message, /Callback failed/);
});

test("Preview diagnostics redact tokens, authorization material, PII, and URLs", () => {
  const message = formatNativeGoogleError({
    error: {
      code: "FAILED",
      message: "email person@example.com idToken=eyJheader.payload.signature Authorization: Bearer secret https://private.invalid/path",
      user: { email: "other@example.com" },
    },
    isPreview: true,
    operation: "createAccount",
    platform: "ios",
  });

  assert.doesNotMatch(message, /person@example|other@example|eyJheader|Bearer secret|private\.invalid/);
  assert.match(message, /\[redacted\]/);
});

test("native error codes are normalized without serializing arbitrary objects", () => {
  assert.equal(getNativeGoogleErrorCode({ code: " GID/42 ", token: "secret" }), "GID42");
  assert.equal(getNativeGoogleErrorCode({ message: "missing code" }), "unknown");
});

test("known cancellation and Android developer-error behavior remain unchanged", () => {
  const source = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  assert.match(source, /code === statusCodes\.SIGN_IN_CANCELLED[\s\S]*status: "cancelled"/);
  assert.match(source, /code === statusCodes\.DEVELOPER_ERROR[\s\S]*not configured for this Android build/);
});

test("normal success still returns the Google ID token and nonce", () => {
  const source = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  assert.match(source, /status: "success", idToken: response\.data\.idToken, nonce/);
  assert.match(source, /isCancelledResponse\(response\)/);
});
