import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "./route";

const expectedConfig = {
  data: {
    apiVersion: "v1",
    minimumSupportedAppVersion: null,
    latestAppVersion: null,
    maintenanceMode: false,
    features: {
      flights: true,
      hotels: false,
      cars: false,
      pushNotifications: false,
      socialAuthentication: false,
      premiumSubscriptions: false,
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
  assert.equal(payload.data.features.socialAuthentication, false);
  assert.equal(payload.data.features.premiumSubscriptions, false);
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
