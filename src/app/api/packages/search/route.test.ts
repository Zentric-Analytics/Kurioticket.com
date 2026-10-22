import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "./route";

test("package search rejects incomplete component context", async () => {
  const response = await POST(new Request("http://local/api/packages/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "hotel-flight", sharedDestination: "London" }) }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Package search needs more detail.");
  assert.ok(body.issues.flight);
  assert.ok(body.issues.hotel);
});

test("package search rejects malformed JSON", async () => {
  const response = await POST(new Request("http://local/api/packages/search", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
});

test("package search rejects unknown journey scopes and hotel-first flight-car requests", async () => {
  for (const body of [{ mode: "hotel-flight", journey: "everything" }, { mode: "flight-car", journey: "staged" }]) {
    const response = await POST(new Request("http://local/api/packages/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
