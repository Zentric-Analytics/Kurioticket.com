import assert from "node:assert/strict";
import test from "node:test";
import { diagnosticSearchResponse } from "./diagnosticResponse";
test("measured serialization preserves JSON contract and headers without extra serialization", async () => {
  let serializations = 0;
  const value = { toJSON() { serializations++; return { results: [{ id: "synthetic", name: "Zürich" }] }; } };
  const response = diagnosticSearchResponse("hotel", "e920ef92-db0f-4959-9262-1657fd404d23", value, { status: 202, headers: { "Cache-Control": "no-store" } });
  assert.equal(serializations, 1); assert.equal(response.status, 202);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { results: [{ id: "synthetic", name: "Zürich" }] });
});
