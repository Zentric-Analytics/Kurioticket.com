import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "./route";

const environmentKeys = ["NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "RENDER_GIT_COMMIT", "TRAVEL_PROVIDER_MODE", "DUFFEL_API_MODE", "ALLOW_SANDBOX_PROVIDERS", "DUFFEL_API_KEY"] as const;
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("mobile health returns availability and API compatibility", async () => {
  const response = await GET();
  const payload = await response.json() as { data: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    data: {
      available: true,
      apiVersion: "v1",
      environment: "production",
    },
  });
});

test("mobile health does not expose sensitive environment information", async () => {
  const response = await GET();
  const payload = await response.json() as { data: Record<string, unknown> };
  const body = JSON.stringify(payload);

  assert.equal(payload.data.environment, "production");
  assert.equal(Object.hasOwn(payload.data, "time"), false);
  assert.equal(Object.hasOwn(payload.data, "service"), false);
  assert.equal(body.includes("NODE_ENV"), false);
  assert.equal(body.includes("DATABASE_URL"), false);
  assert.equal(body.includes("SECRET"), false);
});

test("mobile health disables response caching", async () => {
  const response = await GET();

  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("mobile health reports only the staging public classification", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  process.env.RENDER_GIT_COMMIT = "a".repeat(40);
  process.env.TRAVEL_PROVIDER_MODE = "staging";
  process.env.NEXTAUTH_URL = "https://staging.kurioticket.com";
  process.env.DUFFEL_API_MODE = "test";
  process.env.ALLOW_SANDBOX_PROVIDERS = "true";
  process.env.DUFFEL_API_KEY = "configured-test-credential";
  const payload = await (await GET()).json() as { data: { environment: string; releaseReadiness: { commitSha: string; releaseTimestamp: string; applicationVersion: string | null; sandboxTravelSafe: boolean; emailPolicyRestricted: boolean } } };
  assert.equal(payload.data.environment, "staging");
  assert.equal(payload.data.releaseReadiness.commitSha, "a".repeat(40));
  assert.match(payload.data.releaseReadiness.releaseTimestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(payload.data.releaseReadiness.applicationVersion, process.env.npm_package_version?.trim() || null);
  assert.equal(payload.data.releaseReadiness.sandboxTravelSafe, true);
  assert.equal(payload.data.releaseReadiness.emailPolicyRestricted, true);
});
