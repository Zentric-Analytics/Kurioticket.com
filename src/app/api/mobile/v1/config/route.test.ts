import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "./route";

const environmentKeys = ["NEXT_PUBLIC_APP_URL", "RENDER_GIT_COMMIT"] as const;
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const expectedConfig = {
  data: {
    apiVersion: "v1",
    environment: "production",
    minimumSupportedAppVersion: null,
    latestAppVersion: null,
    maintenanceMode: false,
    features: {
      flights: true,
      hotels: false,
      cars: false,
      pushNotifications: false,
      socialAuthentication: true,
      externalCheckout: true,
    },
  },
};

test("mobile config returns the exact Version 1 public response structure", async () => {
  const response = await GET();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, expectedConfig);
});

test("mobile config exposes explicit safe feature defaults", async () => {
  const response = await GET();
  const payload = await response.json() as typeof expectedConfig;

  assert.equal(payload.data.features.flights, true);
  assert.equal(payload.data.features.hotels, false);
  assert.equal(payload.data.features.cars, false);
  assert.equal(payload.data.features.pushNotifications, false);
  assert.equal(payload.data.features.socialAuthentication, true);
  assert.equal(payload.data.features.externalCheckout, true);
  assert.deepEqual(Object.keys(payload.data.features).sort(), ["cars", "externalCheckout", "flights", "hotels", "pushNotifications", "socialAuthentication"]);
});

test("mobile config does not expose secret-bearing or infrastructure fields", async () => {
  const response = await GET();
  const payload = await response.json() as typeof expectedConfig;
  const body = JSON.stringify(payload);

  for (const forbiddenField of [
    "provider",
    "credential",
    "secret",
    "branch",
    "infrastructure",
    "databaseId",
    "diagnostics",
  ]) {
    assert.equal(body.toLowerCase().includes(forbiddenField.toLowerCase()), false);
  }
});

test("mobile config disables response caching", async () => {
  const response = await GET();

  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("mobile config reports only staging and disables provider checkout", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.RENDER_GIT_COMMIT = "b".repeat(40);
  const payload = await (await GET()).json() as { data: { environment: string; releaseReadiness: { commitSha: string | null }; features: { externalCheckout: boolean } } };
  assert.equal(payload.data.environment, "staging");
  assert.equal(payload.data.releaseReadiness.commitSha, "b".repeat(40));
  assert.equal(payload.data.features.externalCheckout, false);
});
