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

test("queued admission expires even when the active writer has not settled", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 0;
  const run = createCacheWriteGate(() => now);
  let release!: () => void;
  const writer = run(() => new Promise<void>(resolve => { release = resolve; }));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  let calls = 0;
  const rejected = assert.rejects(run(async () => { calls++; }, 10), /deadline exceeded/);
  now = 10;
  t.mock.timers.tick(10);
  await rejected;
  assert.equal(calls, 0);
  // A successor must still wait for the original writer, even though its
  // immediate predecessor has expired and released its own queue slot.
  const successor = run(async () => { calls++; }, 100);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(calls, 0);
  release();
  await Promise.all([writer, successor]);
  assert.equal(calls, 1);
  t.mock.timers.tick(100);
});

test("multiple expired waiters cannot reopen a running writer's slot", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 0;
  const run = createCacheWriteGate(() => now);
  let release!: () => void;
  const writer = run(() => new Promise<void>(resolve => { release = resolve; }));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  const expired = [10, 20, 30].map(deadline => assert.rejects(run(async () => assert.fail("expired work must not start"), deadline), /deadline exceeded/));
  now = 30; t.mock.timers.tick(30); await Promise.all(expired);
  let successorStarted = false;
  const successor = run(async () => { successorStarted = true; }, 100);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(successorStarted, false);
  release(); await Promise.all([writer, successor]);
  assert.equal(successorStarted, true);
});
