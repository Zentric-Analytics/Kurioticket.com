import assert from "node:assert/strict";
import test from "node:test";
import { publishCohort } from "./publishCohort";

test("45 chunks publish in six sequential bounded batches without dropping bytes", async () => {
  const chunks = Array.from({ length: 45 }, (_, i) => `chunk-${i}`);
  const written: string[] = [];
  let active = 0, maximum = 0, calls = 0, published = false;
  await publishCohort(chunks, async (batch, offset) => {
    maximum = Math.max(maximum, ++active);
    assert.ok(batch.length <= 8);
    assert.equal(offset, written.length);
    assert.equal(published, false);
    await Promise.resolve();
    written.push(...batch);
    calls++;
    active--;
  }, async () => { assert.deepEqual(written, chunks); published = true; });
  assert.equal(calls, 6);
  assert.equal(maximum, 1);
  assert.equal(published, true);
});

test("failed chunk batch never publishes a partial generation", async () => {
  let published = false;
  await assert.rejects(publishCohort(Array.from({ length: 20 }, (_, i) => i), async (_, offset) => {
    if (offset === 8) throw new Error("write failed");
  }, async () => { published = true; }), /write failed/);
  assert.equal(published, false);
});
