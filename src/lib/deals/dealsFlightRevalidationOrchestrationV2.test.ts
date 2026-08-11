import assert from "node:assert/strict";
import test from "node:test";
import { createDealsFlightRevalidationCoordinatorV2 } from "./dealsFlightRevalidationV2";

type ResultStatus =
  | "confirmed"
  | "changed"
  | "temporary-failure"
  | "expired"
  | "unavailable"
  | "invalid-selection";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const race = async (lateStatus: ResultStatus) => {
  const coordinator = createDealsFlightRevalidationCoordinatorV2();
  const response = deferred<ResultStatus>();
  const transitions: ResultStatus[] = [];
  let selectedFare = "fare-a";
  let pendingChange: string | null = "fare-a-change";
  let message: string | null = "old revalidation message";
  let status = "loading";
  let networkError = false;

  const oldRequest = coordinator.request();
  const confirmation = response.promise
    .then((result) => {
      if (coordinator.current(oldRequest)) {
        transitions.push(result);
        selectedFare = result === "confirmed" ? "fare-a" : selectedFare;
        pendingChange = result === "changed" ? "fare-a-change" : null;
      }
    })
    .catch((error: unknown) => {
      if (
        coordinator.current(oldRequest) &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        networkError = true;
    })
    .finally(() => coordinator.finish(oldRequest));

  coordinator.cancel();
  pendingChange = null;
  message = null;
  selectedFare = "fare-b";
  status = "success";

  assert.equal(oldRequest.controller.signal.aborted, true);
  assert.equal(coordinator.current(oldRequest), false);
  assert.equal(coordinator.generation(), oldRequest.generation + 1);
  assert.equal(pendingChange, null);
  assert.equal(message, null);
  assert.equal(status, "success");

  response.resolve(lateStatus);
  await confirmation;
  assert.equal(selectedFare, "fare-b");
  assert.equal(pendingChange, null);
  assert.deepEqual(transitions, []);
  assert.equal(networkError, false);

  const freshRequest = coordinator.request();
  assert.equal(coordinator.current(freshRequest), true);
  transitions.push("confirmed");
  selectedFare = "fare-b";
  coordinator.finish(freshRequest);
  assert.deepEqual(transitions, ["confirmed"]);
  assert.equal(selectedFare, "fare-b");
};

for (const result of ["confirmed", "changed", "expired"] as const) {
  test(`selecting Fare B makes a late Fare A ${result} result harmless`, async () => {
    await race(result);
  });
}

test("all other late Fare A outcomes are harmless after Fare B is selected", async () => {
  for (const result of [
    "temporary-failure",
    "unavailable",
    "invalid-selection",
  ] as const)
    await race(result);
});
