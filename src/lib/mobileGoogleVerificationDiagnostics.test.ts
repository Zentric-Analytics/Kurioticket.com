import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, test } from "node:test";
import {
  classifyGoogleVerifyError,
  logMobileGoogleClaimsRejected,
  logMobileGoogleVerificationPassed,
  logMobileGoogleVerificationRejected,
} from "./mobileGoogleVerificationDiagnostics";

const originalEnvironment = {
  TRAVEL_PROVIDER_MODE: process.env.TRAVEL_PROVIDER_MODE,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};
const originalWarn = console.warn;
let output: unknown[][];

beforeEach(() => {
  delete process.env.TRAVEL_PROVIDER_MODE;
  process.env.NEXT_PUBLIC_APP_URL = "https://www.kurioticket.com";
  process.env.NEXTAUTH_URL = "https://www.kurioticket.com";
  output = [];
  console.warn = (...args: unknown[]) => output.push(args);
});

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  console.warn = originalWarn;
});

function enableStaging() {
  process.env.TRAVEL_PROVIDER_MODE = "staging";
}

test("Production emits no mobile Google verification diagnostics", () => {
  logMobileGoogleVerificationRejected(new Error("invalid signature: secret-token"));
  logMobileGoogleClaimsRejected({
    subjectPresent: false,
    emailPresent: false,
    emailVerified: false,
    noncePresent: false,
    nonceMatches: false,
  });
  logMobileGoogleVerificationPassed();
  assert.deepEqual(output, []);
});

test("verification rejection is distinguishable and exposes only an allowlisted classification", () => {
  enableStaging();
  const error = new Error("invalid signature: secret-token");
  logMobileGoogleVerificationRejected(error);

  assert.deepEqual(output, [["[mobile-google-verification]", {
    event: "mobile_google_verification_rejected",
    stage: "verifyIdToken",
    verified: false,
    verifyErrorClass: "signature",
  }]]);
  assert.doesNotMatch(JSON.stringify(output), /secret-token/);
});

test("arbitrary verification errors are not serialized", () => {
  enableStaging();
  logMobileGoogleVerificationRejected({ token: "raw-id-token", nonce: "raw-nonce", email: "person@example.com" });

  assert.equal(JSON.stringify(output).includes("raw-id-token"), false);
  assert.equal(JSON.stringify(output).includes("raw-nonce"), false);
  assert.equal(JSON.stringify(output).includes("person@example.com"), false);
  assert.equal((output[0]?.[1] as { verifyErrorClass: string }).verifyErrorClass, "unknown");
});

test("verified-claim rejection logs booleans only", () => {
  enableStaging();
  logMobileGoogleClaimsRejected({
    subjectPresent: true,
    emailPresent: true,
    emailVerified: true,
    noncePresent: true,
    nonceMatches: false,
  });

  assert.deepEqual(output, [["[mobile-google-verification]", {
    event: "mobile_google_claims_rejected",
    stage: "verifiedClaims",
    verified: true,
    subjectPresent: true,
    emailPresent: true,
    emailVerified: true,
    noncePresent: true,
    nonceMatches: false,
  }]]);
  const serialized = JSON.stringify(output);
  assert.doesNotMatch(serialized, /raw-id-token|raw-subject|person@example\.com|raw-client-id|raw-audience|raw-azp|raw-picture|raw-nonce/i);
});

test("successful verification logs a minimal staging checkpoint", () => {
  enableStaging();
  logMobileGoogleVerificationPassed();
  assert.deepEqual(output, [["[mobile-google-verification]", {
    event: "mobile_google_verification_passed",
    verified: true,
    claimsAccepted: true,
  }]]);
});

test("verification error classifier uses only allowlisted classes", () => {
  assert.equal(classifyGoogleVerifyError(new Error("Wrong recipient, payload audience != requiredAudience")), "audience");
  assert.equal(classifyGoogleVerifyError(new Error("Invalid issuer")), "issuer");
  assert.equal(classifyGoogleVerifyError(new Error("Token used too late")), "expired");
  assert.equal(classifyGoogleVerifyError(new Error("Wrong number of segments")), "malformed");
  assert.equal(classifyGoogleVerifyError(new Error("No pem found for envelope")), "certificate");
  assert.equal(classifyGoogleVerifyError(new Error("unexpected details")), "unknown");
});

test("route preserves both generic 401 responses and authentication ordering", () => {
  const route = readFileSync(new URL("../app/api/mobile/v1/auth/google/route.ts", import.meta.url), "utf8");
  const verification = route.indexOf("verifyIdToken");
  const claimGate = route.indexOf("payload.nonce !== nonce");
  const previewPolicy = route.indexOf("canUseStagingGoogle(", claimGate);
  const accountLinking = route.indexOf("getOrCreateGoogleUser(", previewPolicy);
  const twoFactor = route.indexOf("createMobileTwoFactorChallenge(", accountLinking);
  const session = route.indexOf("createMobileSession(", twoFactor);

  assert.equal((route.match(/NextResponse\.json\(\{ error: genericError \}, \{ status: 401 \}\)/g) || []).length, 2);
  assert.ok(verification > -1 && claimGate > verification);
  assert.ok(previewPolicy > claimGate && accountLinking > previewPolicy);
  assert.ok(twoFactor > accountLinking && session > twoFactor);
});

test("diagnostics reuse the canonical staging guard", () => {
  const source = readFileSync(new URL("./mobileGoogleVerificationDiagnostics.ts", import.meta.url), "utf8");
  assert.match(source, /import \{ isStagingEnvironment \} from "\.\/stagingSafety"/);
  assert.doesNotMatch(source, /TRAVEL_PROVIDER_MODE|NEXT_PUBLIC_APP_URL|NEXTAUTH_URL|staging\.kurioticket\.com/);
});
