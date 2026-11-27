import assert from "node:assert/strict";
import test from "node:test";
import { createSearchDiagnostics } from "./diagnostics";
const requestId = "e920ef92-db0f-4959-9262-1657fd404d23";
test("diagnostics allowlist rejects payload/identity fields and arbitrary error text", () => {
  const events: Record<string, unknown>[] = []; let time = 10;
  const trace = createSearchDiagnostics("flight", requestId, "native", { now: () => time, platform: "android", sink: e => events.push(e) });
  time = 25;
  trace("terminal", { count: 120, category: "private-token", durationMs: NaN, ...{ payload: "secret", ip: "192.0.2.1", trackingId: "private" } });
  assert.deepEqual(events, [{ version: 1, product: "flight", requestId, source: "native", phase: "terminal", elapsedMs: 15, platform: "android", count: 120 }]);
});
test("failing logging and clocks cannot fail a search", () => {
  const trace = createSearchDiagnostics("hotel", requestId, "server", { now: () => { throw Error(); }, sink: () => { throw Error(); } });
  assert.doesNotThrow(() => trace("cache-complete", { category: "success" }));
});
test("request correlation is scoped and never accepts session or supplier tracking IDs", () => {
  const events: Record<string, unknown>[] = [];
  createSearchDiagnostics("car", "private-tracking-id", "server", { sink: e => events.push(e) })("initiation");
  createSearchDiagnostics("car", requestId, "server", { sink: e => events.push(e) })("admission");
  assert.equal(events.length, 1); assert.equal(events[0].requestId, requestId);
});
