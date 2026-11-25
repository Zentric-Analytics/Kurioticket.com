import assert from "node:assert/strict";
import test from "node:test";
import { shareAndRecordObservedAction } from "./nativeShareTrackingCore";

test("OS-reported shared action produces one consented optional observation", async () => {
  const contexts: number[] = [];
  const response = await shareAndRecordObservedAction({
    share: async () => ({ action: "sharedAction" }),
    canVerifyCompletion: true,
    trackingContext: () => 7,
    record: async context => { contexts.push(context); },
  });
  assert.equal(response.action, "sharedAction");
  assert.deepEqual(contexts, [7]);
});

test("dismissed or unknown share actions produce no completion event", async () => {
  for (const action of ["dismissedAction", "unknown", ""]) {
    let count = 0;
    await shareAndRecordObservedAction({
      share: async () => ({ action }),
      canVerifyCompletion: true,
    trackingContext: () => 4,
      record: async () => { count++; },
    });
    assert.equal(count, 0);
  }
});

test("no consent or withdrawn consent never records an OS share action", async () => {
  let count = 0;
  await shareAndRecordObservedAction({
    share: async () => ({ action: "sharedAction" }),
    canVerifyCompletion: true,
    trackingContext: () => null,
    record: async () => { count++; },
  });
  let active: number | null = 1;
  let finish!: (value: { action: string }) => void;
  const share = new Promise<{ action: string }>(resolve => { finish = resolve; });
  const pending = shareAndRecordObservedAction({
    share: async () => share,
    canVerifyCompletion: true,
    trackingContext: () => active,
    record: async () => { count++; },
  });
  active = null;
  finish({ action: "sharedAction" });
  await pending;
  assert.equal(count, 0);
});

test("a switch to another account never attaches the former share", async () => {
  let generation = 10;
  let finish!: (value: { action: string }) => void;
  const pending = shareAndRecordObservedAction({
    share: () => new Promise<{ action: string }>(resolve => { finish = resolve; }),
    canVerifyCompletion: true,
    trackingContext: () => generation,
    record: async () => { assert.fail("no cross-account share event"); },
  });
  generation++;
  finish({ action: "sharedAction" });
  await pending;
});

test("an optional analytics failure never changes a valid share outcome", async () => {
  const result = await shareAndRecordObservedAction({
    share: async () => ({ action: "sharedAction" }),
    canVerifyCompletion: true,
    trackingContext: () => 3,
    record: async () => { throw new Error("offline"); },
  });
  assert.equal(result.action, "sharedAction");
});

test("a rejected or cancelled native share does not invoke analytics", async () => {
  await assert.rejects(() => shareAndRecordObservedAction({
    share: async (): Promise<{ action: string }> => { throw new Error("share unavailable"); },
    canVerifyCompletion: true,
    trackingContext: () => 1,
    record: async () => { assert.fail("no analytics after share error"); },
  }), /share unavailable/);
});

test("genuine repeated completed share actions are distinct observations", async () => {
  let count = 0;
  for (let i = 0; i < 2; i++) {
    await shareAndRecordObservedAction({
      share: async () => ({ action: "sharedAction" }),
      canVerifyCompletion: true,
    trackingContext: () => 8,
      record: async () => { count++; },
    });
  }
  assert.equal(count, 2);
});

test("Android chooser sharedAction never claims successful sharing", async () => {
  let observations = 0;
  const response = await shareAndRecordObservedAction({
    share: async () => ({ action: "sharedAction" }),
    canVerifyCompletion: false,
    trackingContext: () => 99,
    record: async () => { observations++; },
  });
  assert.equal(response.action, "sharedAction");
  assert.equal(observations, 0);
});
