import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/support/tickets/route";

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
