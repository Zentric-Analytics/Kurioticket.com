import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  assertStagingAuthenticationSafety,
  assertStagingEmailSafety,
  getPublicEnvironment,
  getStagingProviderSafety,
  isStagingEnvironment,
  withEnvironmentMetadata,
} from "@/lib/stagingSafety";
import { searchDuffelFlights } from "@/services/travel/providers/duffelProvider";

const keys = [
  "TRAVEL_PROVIDER_MODE",
  "DUFFEL_API_MODE",
  "ALLOW_SANDBOX_PROVIDERS",
  "NEXT_PUBLIC_APP_URL",
  "NEXTAUTH_URL",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "STAGING_EMAIL_ALLOWED_RECIPIENTS",
  "DUFFEL_API_KEY",
] as const;
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configureStaging() {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.NEXTAUTH_URL = "https://staging.kurioticket.com";
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  process.env.DUFFEL_API_MODE = "test";
  process.env.ALLOW_SANDBOX_PROVIDERS = "true";
  process.env.DUFFEL_API_KEY = ["duffel", "test", "placeholder"].join("_");
}

test("staging provider safety requires explicit provider mode", () => {
  configureStaging();
  delete process.env.TRAVEL_PROVIDER_MODE;
  assert.deepEqual(getStagingProviderSafety(), { safe: false, reason: "staging_provider_mode_required" });
});

test("staging provider safety rejects live or missing Duffel mode", () => {
  configureStaging();
  process.env.DUFFEL_API_MODE = "live";
  assert.equal(getStagingProviderSafety().safe, false);
  delete process.env.DUFFEL_API_MODE;
  assert.equal(getStagingProviderSafety().safe, false);
});

test("staging detection uses server configuration and ignores request headers", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.TRAVEL_PROVIDER_MODE = "production";
  const spoofedRequest = new Request("https://kurioticket.com", { headers: { host: "staging.kurioticket.com" } });
  assert.equal(spoofedRequest.headers.get("host"), "staging.kurioticket.com");
  assert.equal(isStagingEnvironment(), false);
});

test("Duffel provider access is disabled before any request when staging controls are invalid", async () => {
  configureStaging();
  process.env.DUFFEL_API_MODE = "live";
  process.env.DUFFEL_API_KEY = "configured-placeholder";

  const result = await searchDuffelFlights({
    tripType: "one-way",
    origin: "AAA",
    destination: "BBB",
    departureDate: "2030-01-01",
    adults: 1,
    children: 0,
    infants: 0,
    travelers: 1,
    cabinClass: "economy",
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.error, "staging_provider_test_mode_required");
});

test("staging provider safety rejects disabled sandbox permission", () => {
  configureStaging();
  process.env.ALLOW_SANDBOX_PROVIDERS = "false";
  assert.equal(getStagingProviderSafety().safe, false);
});

test("staging provider safety rejects missing sandbox permission and credential", () => {
  configureStaging();
  delete process.env.ALLOW_SANDBOX_PROVIDERS;
  assert.equal(getStagingProviderSafety().safe, false);
  configureStaging();
  delete process.env.DUFFEL_API_KEY;
  assert.deepEqual(getStagingProviderSafety(), { safe: false, reason: "staging_provider_credential_required" });
});

test("staging provider safety accepts explicit test configuration", () => {
  configureStaging();
  assert.deepEqual(getStagingProviderSafety(), { safe: true });
});

test("Production provider behavior remains outside staging validation", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  process.env.TRAVEL_PROVIDER_MODE = "production";
  process.env.DUFFEL_API_MODE = "live";
  process.env.ALLOW_SANDBOX_PROVIDERS = "false";
  assert.deepEqual(getStagingProviderSafety(), { safe: true });
  assert.equal(getPublicEnvironment(), "production");
});

function testAddress(local: string, domain = ["example", "test"].join(".")) {
  return [local, domain].join("@");
}

test("staging email validates a single recipient and safely labelled sender", () => {
  configureStaging();
  const allowed = testAddress("recipient");
  const blocked = testAddress("blocked");
  const sender = testAddress("staging-notifications");

  assert.doesNotThrow(() => assertStagingEmailSafety({ to: allowed, from: sender }));
  assert.doesNotThrow(() => assertStagingEmailSafety({ to: testAddress("recipient+tag"), from: sender }));
  assert.throws(() => assertStagingEmailSafety({ to: `${allowed},${blocked}`, from: sender }), /not valid/);
  assert.throws(() => assertStagingEmailSafety({ to: `Recipient <${allowed}>`, from: sender }), /not valid/);
  assert.doesNotThrow(() => assertStagingEmailSafety({ to: ` ${allowed.toUpperCase()} `, from: sender }));
});

test("staging email requires an exact sender label", () => {
  configureStaging();
  const allowed = testAddress("recipient");
  assert.throws(() => assertStagingEmailSafety({ to: allowed, from: testAddress("notstaging") }), /sender/);
  assert.throws(() => assertStagingEmailSafety({ to: allowed, from: `${testAddress("staging")},${testAddress("preview")}` }), /sender/);
  assert.doesNotThrow(() => assertStagingEmailSafety({ to: allowed, from: `Kurioticket Preview <${testAddress("notifications", "staging.example.test")}>` }));
});

test("staging authentication requires canonical URLs and configured secrets", () => {
  configureStaging();
  assert.throws(() => assertStagingAuthenticationSafety(), /secrets are not configured/);
  process.env.AUTH_SECRET = "configured";
  process.env.NEXTAUTH_SECRET = "configured-separately";
  assert.throws(() => assertStagingAuthenticationSafety(), /provider credentials are not configured/);
  process.env.AUTH_GOOGLE_ID = "configured-client";
  process.env.AUTH_GOOGLE_SECRET = "configured-provider-secret";
  assert.doesNotThrow(() => assertStagingAuthenticationSafety());
  process.env.NEXTAUTH_URL = "https://kurioticket.com";
  assert.throws(() => assertStagingAuthenticationSafety(), /URLs are not safely configured/);
  process.env.NEXTAUTH_URL = "https://staging.kurioticket.com.attacker.invalid";
  assert.throws(() => assertStagingAuthenticationSafety(), /URLs are not safely configured/);
});

test("public and analytics environment values contain only the safe classification", () => {
  configureStaging();
  assert.equal(getPublicEnvironment(), "staging");
  assert.deepEqual(withEnvironmentMetadata({ source: "test" }), { source: "test", environment: "staging" });
});
