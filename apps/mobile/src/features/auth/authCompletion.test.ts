import assert from "node:assert/strict";
import test from "node:test";
import { scheduleAuthCompletion } from "./authCompletion";

test("auth success completion fires exactly once", async () => {
  let completions = 0;
  scheduleAuthCompletion(() => { completions += 1; }, 5);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(completions, 1);
});

test("a parent callback update does not postpone the one-shot completion", async () => {
  const calls: string[] = [];
  let current = () => calls.push("initial");
  scheduleAuthCompletion(() => current(), 10);
  current = () => calls.push("latest");
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(calls, ["latest"]);
});

test("unmounted auth success cancels completion", async () => {
  let completions = 0;
  const cancel = scheduleAuthCompletion(() => { completions += 1; }, 10);
  cancel();
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(completions, 0);
});
