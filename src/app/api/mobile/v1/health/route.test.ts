import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "./route";

test("mobile health returns availability and API compatibility", async () => {
  const response = await GET();
  const payload = await response.json() as { data: Record<string, unknown> };

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    data: {
      available: true,
      apiVersion: "v1",
    },
  });
});

test("mobile health does not expose sensitive environment information", async () => {
  const response = await GET();
  const payload = await response.json() as { data: Record<string, unknown> };
  const body = JSON.stringify(payload);

  assert.equal(Object.hasOwn(payload.data, "environment"), false);
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
