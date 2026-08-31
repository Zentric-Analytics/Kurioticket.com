import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { androidAssociation, appleAssociation } from "./webauthn-associations";

const service = readFileSync("src/services/passkeyService.ts", "utf8");
const reauthRoute = readFileSync("src/app/api/mobile/v1/security/passkeys/reauth/route.ts", "utf8");
const appleRoute = readFileSync("src/app/.well-known/apple-app-site-association/route.ts", "utf8");
const androidRoute = readFileSync("src/app/.well-known/assetlinks.json/route.ts", "utf8");
const environment = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

test("registration accepts browser authenticatorData or native attestationObject without trusting a client credential id", () => {
  assert.match(service, /typeof response\.authenticatorData === "string"/);
  assert.match(service, /authenticatorDataFromAttestationObject\(response\.attestationObject\)/);
  assert.match(service, /parseRegistrationAuthData\(authenticatorData\)/);
  assert.match(service, /credentialId:auth\.credentialId/);
  assert.doesNotMatch(service, /credentialId:response\.(?:id|rawId|credentialId)/);
});

test("password reauthentication is reachable before code-only validation", () => {
  const passwordIndex = reauthRoute.indexOf("user.passwordHash && parsed.data.password");
  const codeRequiredIndex = reauthRoute.indexOf("if (!code)");
  assert.ok(passwordIndex >= 0, "password reauthentication branch must exist");
  assert.ok(codeRequiredIndex > passwordIndex, "password verification must run before code-only rejection");
  assert.match(reauthRoute, /bcrypt\.compare\(parsed\.data\.password, user\.passwordHash\)/);
  assert.match(reauthRoute, /mintReauthToken\([^]*purpose, "password"\)/);
});

test("Apple association requires authoritative full application identifiers", () => {
  assert.deepEqual(
    appleAssociation(environment({ WEBAUTHN_IOS_APP_IDS: "ABCDE12345.com.kurioticket.app.preview,ABCDE12345.com.kurioticket.app" })),
    { webcredentials: { apps: ["ABCDE12345.com.kurioticket.app.preview", "ABCDE12345.com.kurioticket.app"] } },
  );
  assert.throws(() => appleAssociation(environment({ WEBAUTHN_IOS_APP_IDS: "TEAM_ID.com.kurioticket.app" })));
});

test("Android association includes login credential delegation and authoritative fingerprints", () => {
  const fingerprint = Array.from({ length: 32 }, () => "ab").join(":");
  const result = androidAssociation(environment({
    WEBAUTHN_ANDROID_PACKAGE_NAME: "com.kurioticket.app.preview",
    WEBAUTHN_ANDROID_CERT_SHA256: fingerprint,
  }));
  assert.deepEqual(result[0].relation, [
    "delegate_permission/common.handle_all_urls",
    "delegate_permission/common.get_login_creds",
  ]);
  assert.equal(result[0].target.package_name, "com.kurioticket.app.preview");
  assert.deepEqual(result[0].target.sha256_cert_fingerprints, [fingerprint.toUpperCase()]);
  assert.throws(() => androidAssociation(environment({ WEBAUTHN_ANDROID_PACKAGE_NAME: "com.kurioticket.app.preview" })));
});

test("well-known endpoints are public, direct JSON routes that fail closed", () => {
  for (const source of [appleRoute, androidRoute]) {
    assert.match(source, /export (?:async )?function GET/);
    assert.match(source, /NextResponse\.json/);
    assert.match(source, /status:503/);
    assert.doesNotMatch(source, /requireMobileSecurity|redirect\(/);
  }
});
