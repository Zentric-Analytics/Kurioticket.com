import test from "node:test";
import assert from "node:assert/strict";
import { createCacheWriteGate } from "./cacheWriteGate";

test("concurrent searches share one cache writer", async () => {
  const run = createCacheWriteGate();
  let active = 0, peak = 0;
  await Promise.all([1, 2, 3].map(() => run(async () => {
    peak = Math.max(peak, ++active);
    await new Promise<void>(resolve => setImmediate(resolve));
    active--;
  })));
  assert.equal(peak, 1);
});
test("failure prevents queued writes and recovers after cooldown", async () => {
  let now = 100;
  const run = createCacheWriteGate(() => now);
  let calls = 0;
  const results = await Promise.allSettled([
    run(async () => { calls++; throw new Error("database unavailable"); }),
    run(async () => { calls++; }),
  ]);
  assert.equal(calls, 1);
  assert.ok(results.every(result => result.status === "rejected"));
  now += 5001;
  await run(async () => { calls++; });
  assert.equal(calls, 2);
});
test("expired work does not start", async () => {
  const run = createCacheWriteGate(() => 100);
  await assert.rejects(run(async () => assert.fail("must not write"), 99));
});
