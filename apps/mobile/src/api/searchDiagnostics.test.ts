import assert from "node:assert/strict";
import test from "node:test";
import { nativeTravelApiHarness } from "./testsupport/travelApiHarness";
const requestId = "e920ef92-db0f-4959-9262-1657fd404d23";
for (const product of ["Flights", "Hotels", "Cars"] as const) test(`${product}: transport boundaries contain counts and canonical IDs, never criteria or rows`, async t => {
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, "info", (tag: unknown, event: string) => { if (tag === "[search:lifecycle]") events.push(JSON.parse(event)); });
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async () => Response.json({ results: [{ id: "private-row" }], requestId }), { registered: false });
  await harness.api[`search${product}`]({ criteria: "private-criteria" }, { requestId });
  assert.deepEqual(events.map(e => e.phase), ["initiation", "timer-start", "response-received", "body-start", "body-complete", "terminal", "timer-stop"]);
  assert.ok(events.every(e => e.requestId === requestId));
  assert.doesNotMatch(JSON.stringify(events), /private-row|private-criteria|test-session/);
});
test("native logging failure cannot turn successful inventory into a network error", async t => {
  t.mock.method(console, "info", () => { throw Error("synthetic logger failure"); });
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async () => Response.json({ results: [{ id: "synthetic" }], requestId }));
  const result = await harness.api.searchFlights({}, { requestId });
  assert.equal(result.results.length, 1);
});
test("progressive response links the first-party attempt to the canonical search without leaking supplier tracking", async t => {
  const canonical = "e4cd32c7-fa37-4e07-85e4-ca4f2ac83e5e";
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, "info", (tag: unknown, event: string) => { if (tag === "[search:lifecycle]") events.push(JSON.parse(event)); });
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async () => Response.json({ results: [], requestId: canonical }));
  await harness.api.searchHotelsProgressive({}, null, { requestId });
  const link = events.find(e => e.phase === "correlation");
  assert.equal(link?.requestId, canonical); assert.equal(link?.relatedRequestId, requestId);
  assert.equal(events.find(e => e.phase === "terminal")?.requestId, canonical);
});
