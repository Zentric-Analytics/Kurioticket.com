import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiBaseUrl } from "../config/apiUrl";
import { getMobileHealth, parseConfigResponse, parseHealthResponse } from "../api/mobileApi";

test("normalizes API base URLs", () => {
  assert.deepEqual(normalizeApiBaseUrl(" http://localhost:3000/// "), { ok: true, baseUrl: "http://localhost:3000" });
});

test("requires an API base URL", () => {
  const result = normalizeApiBaseUrl(undefined);
  assert.equal(result.ok, false);
});

test("parses health responses", () => {
  const result = parseHealthResponse({ data: { available: true, apiVersion: "v1" } });
  assert.equal(result.ok, true);
});

test("parses config responses", () => {
  const result = parseConfigResponse({ data: { apiVersion: "v1", minimumSupportedAppVersion: null, latestAppVersion: null, maintenanceMode: false, features: { flights: true, hotels: false, cars: false, pushNotifications: false, socialAuthentication: false, premiumSubscriptions: false } } });
  assert.equal(result.ok, true);
});

test("returns safe errors for non-2xx responses", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const fetcher = async () => ({ ok: false, json: async () => ({ secret: "do-not-read" }) }) as Response;
  const result = await getMobileHealth(fetcher as typeof fetch);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error.message, /could not be reached/);
});
