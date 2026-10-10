import assert from "node:assert/strict";
import test from "node:test";
import { forEachBounded } from "./forEachBounded";

test("processes all 1042 results exactly once with at most two writes in flight", async () => {
  let active = 0;
  let peak = 0;
  const seen = new Set<number>();
  await forEachBounded(Array.from({ length: 1042 }, (_, i) => i), 2, async (i) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(seen.has(i), false);
    seen.add(i);
    active--;
  });
  assert.equal(seen.size, 1042);
  assert.equal(peak, 2);
  assert.equal(active, 0);
});

test("empty input performs no work", async () => {
  await forEachBounded([], 2, async () => assert.fail("unexpected task"));
});

test("invalid concurrency and task failures are not swallowed", async () => {
  await assert.rejects(forEachBounded([1], 0, async () => {}), RangeError);
  await assert.rejects(forEachBounded([1], 1, async () => { throw new Error("write failed"); }), /write failed/);
});
