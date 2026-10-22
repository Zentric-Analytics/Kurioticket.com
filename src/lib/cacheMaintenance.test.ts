import assert from "node:assert/strict";
import test from "node:test";
import { CACHE_MAINTENANCE_SERVICE, startCacheMaintenance, deleteExpiredCacheBatch } from "./cacheMaintenance";

test("maintenance is disabled outside the exact staging service", () => {
  for (const id of [undefined, "production", "srv-other"]) {
    startCacheMaintenance(id, async () => { throw Error("must not run"); }, () => { throw Error("must not schedule"); });
  }
});

test("maintenance waits for completion, survives failure and can stop", async () => {
  const queued: Array<() => void> = [];
  let release!: () => void;
  let calls = 0;
  const stop = startCacheMaintenance(CACHE_MAINTENANCE_SERVICE, async () => {
    calls++;
    await new Promise<void>(resolve => { release = resolve; });
    throw Error("private error must not be logged");
  }, task => { queued.push(task); return { unref() {} } as ReturnType<typeof setTimeout>; });
  assert.equal(queued.length, 1);
  queued.shift()!();
  assert.equal(calls, 1);
  assert.equal(queued.length, 0);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(queued.length, 1);
  stop();
  queued.shift()!();
  assert.equal(calls, 1);
});

test("maintenance lock conflict skips all deletes", async () => {
  const sql: string[] = [];
  const tx = {
    $executeRaw: async (parts: TemplateStringsArray) => { sql.push(parts.join("?")); return 0; },
    $queryRaw: async () => [{ acquired: false }],
  };
  const db = { $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) };
  assert.deepEqual(await deleteExpiredCacheBatch(new Date(), db as never), { flights: 0, providers: 0, skipped: true });
  assert.ok(sql.every(query => !query.includes("DELETE")));
});
