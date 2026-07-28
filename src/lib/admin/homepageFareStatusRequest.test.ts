import assert from "node:assert/strict";
import test from "node:test";

import {
  createHomepageFareStatusRequestCoordinator,
  markHomepageFareStatusRequestFailed,
  markHomepageFareStatusRequestStarted,
  markHomepageFareStatusRequestSucceeded,
  type HomepageFareStatusLoadState,
} from "./homepageFareStatusRequest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("a newer status response cannot be overwritten by an older response", async () => {
  const coordinator = createHomepageFareStatusRequestCoordinator();
  const older = deferred<string>();
  const newer = deferred<string>();
  const results: string[] = [];
  const first = coordinator.run({
    request: () => older.promise,
    onStart() {},
    onSuccess: (value) => results.push(value),
    onError() {},
  });
  const second = coordinator.run({
    request: () => newer.promise,
    onStart() {},
    onSuccess: (value) => results.push(value),
    onError() {},
  });

  newer.resolve("newer");
  await second;
  older.resolve("older");
  await first;

  assert.deepEqual(results, ["newer"]);
});

test("an older failure and intentional abort cannot overwrite a newer success", async () => {
  const coordinator = createHomepageFareStatusRequestCoordinator();
  const older = deferred<string>();
  const newer = deferred<string>();
  const results: string[] = [];
  let errors = 0;
  const first = coordinator.run({
    request: () => older.promise,
    onStart() {},
    onSuccess: (value) => results.push(value),
    onError: () => errors++,
  });
  const second = coordinator.run({
    request: () => newer.promise,
    onStart() {},
    onSuccess: (value) => results.push(value),
    onError: () => errors++,
  });

  newer.resolve("newer");
  await second;
  older.reject(new DOMException("Aborted", "AbortError"));
  await first;

  assert.deepEqual(results, ["newer"]);
  assert.equal(errors, 0);
});

test("loading ownership remains with the latest request", async () => {
  const coordinator = createHomepageFareStatusRequestCoordinator();
  const older = deferred<string>();
  const newer = deferred<string>();
  let loading = false;
  const run = (pending: ReturnType<typeof deferred<string>>) =>
    coordinator.run({
      request: () => pending.promise,
      onStart: () => {
        loading = true;
      },
      onSuccess: () => {
        loading = false;
      },
      onError: () => {
        loading = false;
      },
    });

  const first = run(older);
  const second = run(newer);
  older.resolve("older");
  await first;
  assert.equal(loading, true);
  newer.resolve("newer");
  await second;
  assert.equal(loading, false);
});

test("component disposal prevents status state updates", async () => {
  const coordinator = createHomepageFareStatusRequestCoordinator();
  const pending = deferred<string>();
  let updates = 0;
  const request = coordinator.run({
    request: () => pending.promise,
    onStart() {},
    onSuccess: () => updates++,
    onError: () => updates++,
  });

  coordinator.dispose();
  pending.resolve("ignored");
  await request;

  await coordinator.run({
    request: async () => "not started",
    onStart: () => updates++,
    onSuccess: () => updates++,
    onError: () => updates++,
  });

  assert.equal(updates, 0);
  assert.equal(coordinator.isRequestActive(), false);
});

test("status state distinguishes unavailable, stale, and current data", () => {
  const initial: HomepageFareStatusLoadState<{ value: number }> = {
    data: null,
    loading: false,
    error: "",
    stale: false,
    lastSuccessfulLoadAt: null,
  };
  const initialFailure = markHomepageFareStatusRequestFailed(initial, "failed");
  assert.equal(initialFailure.data, null);
  assert.equal(initialFailure.stale, false);

  const current = markHomepageFareStatusRequestSucceeded(
    { value: 7 },
    "2026-07-28T14:32:00.000Z",
  );
  const started = markHomepageFareStatusRequestStarted(current);
  const stale = markHomepageFareStatusRequestFailed(started, "reload failed");
  assert.deepEqual(stale.data, { value: 7 });
  assert.equal(stale.stale, true);
  assert.equal(stale.lastSuccessfulLoadAt, "2026-07-28T14:32:00.000Z");

  const refreshed = markHomepageFareStatusRequestSucceeded(
    { value: 8 },
    "2026-07-28T14:33:00.000Z",
  );
  assert.equal(refreshed.stale, false);
  assert.equal(refreshed.error, "");
  assert.deepEqual(refreshed.data, { value: 8 });
});
