import * as assert from "node:assert/strict";
import { test } from "node:test";
import { runBootstrap } from "../launch/bootstrap";

const config = { data: { apiVersion: "v1", minimumSupportedAppVersion: null, latestAppVersion: null, maintenanceMode: false, features: { flights: true, hotels: false, cars: false, pushNotifications: false, socialAuthentication: false, premiumSubscriptions: false } } };
function fetcher(responses: unknown[]) { return async () => ({ ok: true, json: async () => responses.shift() }) as Response; }

test("routes a new signed-out user to authentication without persisting guest state", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
  let guestReads = 0;
  const state = await runBootstrap({ fetcher: fetcher([{ data: { available: true, apiVersion: "v1" } }, config]) as typeof fetch, restoreAuthenticatedSession: async () => false, readOnboardingCompleted: async () => { guestReads += 1; return false; } });
  assert.equal(state.status, "ready-first-run");
  assert.equal(guestReads, 1);
});

test("routes a persisted guest to the main app", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const state = await runBootstrap({ fetcher: fetcher([{ data: { available: true, apiVersion: "v1" } }, config]) as typeof fetch, restoreAuthenticatedSession: async () => false, readOnboardingCompleted: async () => true });
  assert.equal(state.status, "ready-guest");
});

test("restores an authenticated session before consulting guest persistence", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
  let guestReads = 0;
  const state = await runBootstrap({ fetcher: fetcher([{ data: { available: true, apiVersion: "v1" } }, config]) as typeof fetch, restoreAuthenticatedSession: async () => true, readOnboardingCompleted: async () => { guestReads += 1; return false; } });
  assert.equal(state.status, "ready-authenticated-reserved");
  assert.equal(guestReads, 0);
});

test("invalid base URL becomes configuration error", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "not a url";
  const state = await runBootstrap({ fetcher: fetcher([]) as typeof fetch });
  assert.equal(state.status, "configuration-error");
});

test("network failure becomes offline", async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000";
  const state = await runBootstrap({ fetcher: (async () => { throw new Error("down"); }) as typeof fetch });
  assert.equal(state.status, "offline");
});
