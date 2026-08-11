import assert from "node:assert/strict";
import test from "node:test";
import { nativeFingerprints } from "./remote-clients.mjs";

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

const hash = (digit) => digit.repeat(64);

test("iOS and Android native fingerprints start together", async () => {
  const ios = deferred();
  const android = deferred();
  const started = [];

  const commandRunner = async (_command, args) => {
    const platform = args[args.indexOf("--platform") + 1];
    started.push(platform);
    const gate = platform === "ios" ? ios : android;
    await gate.promise;
    return { stdout: JSON.stringify({ hash: hash(platform === "ios" ? "a" : "b") }) };
  };

  const fingerprints = nativeFingerprints("/tmp/preview-checkout", { commandRunner, expoToken: "token" });
  await flushMicrotasks();
  assert.deepEqual(started.sort(), ["android", "ios"]);

  ios.resolve();
  await flushMicrotasks();

  let completed = false;
  fingerprints.then(() => { completed = true; });
  await flushMicrotasks();
  assert.equal(completed, false, "fingerprint batch must wait for Android to finish");

  android.resolve();
  assert.deepEqual(await fingerprints, {
    ios: hash("a"),
    android: hash("b"),
  });
});

test("one fingerprint failure waits for the sibling process before rejecting", async () => {
  const android = deferred();
  let androidFinished = false;

  const commandRunner = async (_command, args) => {
    const platform = args[args.indexOf("--platform") + 1];
    if (platform === "ios") throw new Error("ios fingerprint failed");
    await android.promise;
    androidFinished = true;
    return { stdout: JSON.stringify({ hash: hash("b") }) };
  };

  const fingerprints = nativeFingerprints("/tmp/preview-checkout", { commandRunner, expoToken: "token" });
  await flushMicrotasks();
  assert.equal(androidFinished, false);

  android.resolve();
  await assert.rejects(fingerprints, /ios fingerprint failed/);
  assert.equal(androidFinished, true, "Android fingerprint must settle before aggregate failure escapes");
});

test("multiple fingerprint failures preserve both platform reasons", async () => {
  const fingerprints = nativeFingerprints("/tmp/preview-checkout", {
    expoToken: "token",
    commandRunner: async (_command, args) => {
      const platform = args[args.indexOf("--platform") + 1];
      throw new Error(`${platform} fingerprint failed`);
    },
  });

  await assert.rejects(fingerprints, (error) => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /ios: ios fingerprint failed/);
    assert.match(error.message, /android: android fingerprint failed/);
    assert.equal(error.errors.length, 2);
    return true;
  });
});
