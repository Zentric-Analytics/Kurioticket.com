import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { POST } from "./route";

const originalUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalUrl;
});

test("staging blocks provider checkout before resolving a live target", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const response = await POST(new Request("https://staging.kurioticket.com/api/redirect", { method: "POST" }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Provider checkout is disabled in Preview." });
});

test("staging blocks encoded and nested redirect attempts", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://staging.kurioticket.com";
  const response = await POST(new Request("https://staging.kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({ id: encodeURIComponent("https://provider.invalid/book"), type: "flight", redirect: { url: "https://provider.invalid/book" } }),
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(response.status, 403);
});

test("a spoofed Host header cannot enable the staging-only branch in Production", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  const response = await POST(new Request("https://kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json", host: "staging.kurioticket.com" },
  }));
  assert.equal(response.status, 400);
});

test("Production retains the existing redirect request validation", async () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://kurioticket.com";
  const response = await POST(new Request("https://kurioticket.com/api/redirect", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
  }));
  assert.equal(response.status, 400);
});
