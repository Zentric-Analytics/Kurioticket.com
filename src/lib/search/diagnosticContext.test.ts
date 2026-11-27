import assert from "node:assert/strict";
import test from "node:test";
import { withSearchDiagnosticContext, currentSearchDiagnostics } from "./diagnosticContext";
import { createCacheWriteGate } from "./cacheWriteGate";
test("concurrent cache queue diagnostics remain bound to their own admitted searches", async t => {
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, "info", (tag: unknown, event: string) => { if (tag === "[search:lifecycle]") events.push(JSON.parse(event)); });
  const ids = ["e920ef92-db0f-4959-9262-1657fd404d23", "e4cd32c7-fa37-4e07-85e4-ca4f2ac83e5e"];
  const run = createCacheWriteGate();
  await Promise.all(ids.map(id => withSearchDiagnosticContext("flight", id, () => run(async () => { await Promise.resolve(); return id; }))));
  for (const id of ids) assert.deepEqual(events.filter(e => e.requestId === id).map(e => e.phase), ["admission", "cache-queued", "cache-start", "cache-complete"]);
  assert.equal(currentSearchDiagnostics(), undefined);
});
test("unavailable logging cannot prevent a cache publication", async t => {
  t.mock.method(console, "info", () => { throw Error("synthetic sink outage"); });
  const result = await withSearchDiagnosticContext("hotel", "e920ef92-db0f-4959-9262-1657fd404d23", () => createCacheWriteGate()(async () => 42));
  assert.equal(result, 42);
});
