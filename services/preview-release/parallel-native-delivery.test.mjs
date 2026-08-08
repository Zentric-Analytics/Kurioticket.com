import assert from "node:assert/strict";
import test from "node:test";
import { runNativeDeliveries } from "./orchestrator.mjs";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("dual-platform native deliveries start together and complete independently", async () => {
  const ios = deferred();
  const android = deferred();
  const started = [];

  const delivery = runNativeDeliveries({
    ios: async () => {
      started.push("ios");
      return await ios.promise;
    },
    android: async () => {
      started.push("android");
      return await android.promise;
    },
  });

  await flushMicrotasks();
  assert.deepEqual(started.sort(), ["android", "ios"]);

  android.resolve({ buildId: "android-build" });
  await flushMicrotasks();

  let completed = false;
  delivery.then(() => { completed = true; });
  await flushMicrotasks();
  assert.equal(completed, false, "release must wait for the still-running iOS path");

  ios.resolve({ buildId: "ios-build" });
  assert.deepEqual(await delivery, {
    ios: { buildId: "ios-build" },
    android: { buildId: "android-build" },
  });
});

test("one native platform failure does not cancel the other in-flight delivery", async () => {
  const android = deferred();
  let androidFinished = false;

  const delivery = runNativeDeliveries({
    ios: async () => {
      throw new Error("ios failed");
    },
    android: async () => {
      const result = await android.promise;
      androidFinished = true;
      return result;
    },
  });

  await flushMicrotasks();
  assert.equal(androidFinished, false);

  android.resolve({ buildId: "android-build" });
  await assert.rejects(delivery, /ios failed/);
  assert.equal(androidFinished, true, "Android must be allowed to finish before the aggregate failure is raised");
});

test("single-platform native delivery preserves existing semantics", async () => {
  assert.deepEqual(await runNativeDeliveries({
    android: async () => ({ buildId: "android-only" }),
  }), {
    android: { buildId: "android-only" },
  });
});
