import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { GET } from "./route";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
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
  const payload = await (await GET()).json() as { data: { environment: string } };
  assert.equal(payload.data.environment, "staging");
});
