import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNativePasskeyCreationError } from "./nativePasskeyDiagnostics";

test("classifies Android RP ID validation failures", () => {
  assert.equal(normalizeNativePasskeyCreationError({ code: 50152 }).category, "RP_ID_VALIDATION");
  assert.equal(normalizeNativePasskeyCreationError({ message: "RP ID cannot be validated" }).category, "RP_ID_VALIDATION");
});

test("classifies app association, provider, and duplicate failures", () => {
  assert.equal(normalizeNativePasskeyCreationError({ message: "Digital Asset Links verification failed" }).category, "APP_ASSOCIATION");
  assert.equal(normalizeNativePasskeyCreationError({ error: "app-to-website association failed" }).category, "APP_ASSOCIATION");
  assert.equal(normalizeNativePasskeyCreationError({ name: "CreateCredentialProviderConfigurationException" }).category, "PROVIDER_UNAVAILABLE");
  assert.equal(normalizeNativePasskeyCreationError({ message: "excludeCredentials contains a credential that already exists" }).category, "ALREADY_EXISTS");
});

test("keeps cancellation distinct and uses a bounded safe code for unknown failures", () => {
  assert.equal(normalizeNativePasskeyCreationError({ message: "UserCancelled" }).category, "USER_CANCELLED");
  assert.deepEqual(normalizeNativePasskeyCreationError({ code: "E_PROVIDER_42", message: "unexpected" }), {
    category: "UNKNOWN_NATIVE",
    safeNativeCode: "E_PROVIDER_42",
  });
  assert.deepEqual(normalizeNativePasskeyCreationError({ code: "unsafe code: secret@example.com" }), { category: "UNKNOWN_NATIVE" });
});

test("never returns sensitive raw native fields", () => {
  const secret = "challenge=user-secret-token credentialId=private-id";
  const diagnostic = normalizeNativePasskeyCreationError({
    message: secret,
    error: { challenge: secret },
    challenge: secret,
    response: { attestationObject: secret },
  });
  assert.deepEqual(diagnostic, { category: "UNKNOWN_NATIVE" });
  assert.equal(JSON.stringify(diagnostic).includes(secret), false);
});
