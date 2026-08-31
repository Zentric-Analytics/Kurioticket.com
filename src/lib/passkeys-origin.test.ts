import assert from "node:assert/strict";
import test from "node:test";
import { assertAllowedOrigin } from "./passkeys";

const original = { ...process.env };
test.afterEach(() => { process.env = { ...original }; });

test("keeps approved HTTPS origin and rejects arbitrary origins", () => {
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.WEBAUTHN_ORIGINS = "https://kurioticket.com";
  assert.doesNotThrow(() => assertAllowedOrigin("https://kurioticket.com"));
  assert.throws(() => assertAllowedOrigin("custom://kurioticket"));
  assert.throws(() => assertAllowedOrigin("android:apk-key-hash:*"));
});

test("allows only the configured Android certificate and validates an optional package hint", () => {
  const fingerprint = Array(32).fill("AB").join(":");
  const hash = Buffer.from(fingerprint.replace(/:/g, ""), "hex").toString("base64url");
  const origin = `android:apk-key-hash:${hash}`;
  process.env.WEBAUTHN_ANDROID_CERT_SHA256 = fingerprint;
  process.env.WEBAUTHN_ANDROID_PACKAGE_NAME = "com.kurioticket.app.preview";

  // Android Credential Manager's standard collected client data may omit the
  // non-standard package hint. The signed certificate-derived origin remains authoritative.
  assert.doesNotThrow(() => assertAllowedOrigin(origin));
  assert.doesNotThrow(() => assertAllowedOrigin(origin, "com.kurioticket.app.preview"));
  assert.throws(() => assertAllowedOrigin("android:apk-key-hash:unapproved", "com.kurioticket.app.preview"));
  assert.throws(() => assertAllowedOrigin(origin, "com.attacker.app"));
  assert.throws(() => assertAllowedOrigin(origin, null));
});
