import assert from "node:assert/strict";
import test from "node:test";
import { runDeliveries, runNativeDeliveries } from "./orchestrator.mjs";

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

test("web and both native targets start before any target finishes", async () => {
  const web = deferred();
  const ios = deferred();
  const android = deferred();
  const started = [];

  const delivery = runDeliveries({
    web: async () => {
      started.push("web");
      return await web.promise;
    },
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
  assert.deepEqual(started.sort(), ["android", "ios", "web"]);

  ios.resolve({ buildId: "ios-build" });
  android.resolve({ buildId: "android-build" });
  await flushMicrotasks();

  let completed = false;
  delivery.then(() => { completed = true; });
  await flushMicrotasks();
  assert.equal(completed, false, "slow web delivery must not block native start but still gates aggregate completion");

  web.resolve({ deployId: "render-deploy" });
  assert.deepEqual(await delivery, {
    web: { deployId: "render-deploy" },
    ios: { buildId: "ios-build" },
    android: { buildId: "android-build" },
  });
});

test("web failure does not cancel in-flight native deliveries", async () => {
  const ios = deferred();
  const android = deferred();
  const finished = [];

  const delivery = runDeliveries({
    web: async () => {
      throw new Error("render failed");
    },
    ios: async () => {
      const value = await ios.promise;
      finished.push("ios");
      return value;
    },
    android: async () => {
      const value = await android.promise;
      finished.push("android");
      return value;
    },
  });

  await flushMicrotasks();
  assert.deepEqual(finished, []);

  ios.resolve({ buildId: "ios-build" });
  android.resolve({ buildId: "android-build" });
  await assert.rejects(delivery, /render failed/);
  assert.deepEqual(finished.sort(), ["android", "ios"]);
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

test("multiple target failures preserve target names and individual reasons", async () => {
  const delivery = runDeliveries({
    web: async () => {
      throw new Error("render deployment failed");
    },
    ios: async () => {
      throw new Error("ios build failed");
    },
    android: async () => ({ buildId: "android-build" }),
  });

  await assert.rejects(delivery, (error) => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /web/);
    assert.match(error.message, /ios/);
    assert.match(error.message, /render deployment failed/);
    assert.match(error.message, /ios build failed/);
    assert.equal(error.errors.length, 2);
    assert.match(error.errors[0].message, /render deployment failed/);
    assert.match(error.errors[1].message, /ios build failed/);
    return true;
  });
});

test("single-target delivery preserves existing semantics", async () => {
  assert.deepEqual(await runDeliveries({
    web: async () => ({ deployId: "web-only" }),
  }), {
    web: { deployId: "web-only" },
  });

  assert.deepEqual(await runNativeDeliveries({
    android: async () => ({ buildId: "android-only" }),
  }), {
    android: { buildId: "android-only" },
  });

  assert.deepEqual(await runDeliveries({
    ota: async () => ({ updateIds: ["ota-only"] }),
  }), {
    ota: { updateIds: ["ota-only"] },
  });
});
