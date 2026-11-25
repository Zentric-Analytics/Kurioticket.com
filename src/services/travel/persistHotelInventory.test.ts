import assert from "node:assert/strict";
import test from "node:test";
import { persistHotelInventory } from "./persistHotelInventory";

test("published complete inventory releases response without waiting for individual writes", async () => {
  const calls: string[] = [];
  let deferred: (() => Promise<void>) | undefined;
  await persistHotelInventory(async () => { calls.push("publish"); return true; },
    async () => { calls.push("individual"); }, task => { deferred = task; });
  assert.deepEqual(calls, ["publish"]);
  assert.ok(deferred);
  await deferred();
  assert.deepEqual(calls, ["publish", "individual"]);
});

test("failed complete publication keeps individual fallback on response path", async () => {
  const calls: string[] = [];
  await persistHotelInventory(async () => false, async () => { calls.push("fallback"); },
    () => { assert.fail("failed publication must not defer fallback"); });
  assert.deepEqual(calls, ["fallback"]);
});

test("callers without a response scheduler retain awaited persistence", async () => {
  let written = false;
  await persistHotelInventory(async () => true, async () => { written = true; });
  assert.equal(written, true);
});

test("independent cohort and individual cache failures do not discard the successful publication",async()=>{
  await persistHotelInventory(async()=>true,async()=>{throw new Error("individual cache failed");});
  let fallback=false;
  await persistHotelInventory(async()=>{throw new Error("cohort failed");},async()=>{fallback=true;});
  assert.equal(fallback,true);
  await assert.rejects(persistHotelInventory(async()=>false,async()=>{throw new Error("write failed");}),/publication unavailable/);
});
