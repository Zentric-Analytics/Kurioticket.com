import assert from "node:assert/strict";
import test from "node:test";

import { createWebSupportHandler, POST } from "@/app/api/support/tickets/route";
import type { createSupportTicket } from "@/services/supportService";

test("POST /api/support/tickets returns 400 for invalid JSON", async () => {
  const response = await POST(new Request("https://kurioticket.test/api/support/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Invalid request body.");
});

test("public route shares limiter contract and returns canonical retry response", async () => {
  let created = 0;
  const create = (async () => { created++; return { id: "id", subject: "subject" }; }) as unknown as typeof createSupportTicket;
  const handler = createWebSupportHandler({ session: async () => null, create, limit: () => ({ allowed: false, retryAfterSeconds: 17 }) });
  const response = await handler(new Request("https://test/api/support/tickets", { method: "POST", headers: { "content-type": "application/json", "x-mobile-platform": "ios" }, body: JSON.stringify({ email: "guest@example.com", subject: "Need support", category: "account", body: "This is a sufficiently detailed request." }) }));
  assert.equal(response.status, 429); assert.equal(response.headers.get("retry-after"), "17"); assert.equal(created, 0);
});

test("POST /api/support/tickets returns 400 for invalid payload", async () => {
  const response = await POST(new Request("https://kurioticket.test/api/support/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bad", subject: "no", category: "x", body: "short" }),
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, "Please add a little more support detail.");
  assert.ok(body.issues);
});
