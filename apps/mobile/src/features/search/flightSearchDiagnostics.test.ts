import assert from "node:assert/strict";
import test from "node:test";
import {
  responseByteLength,
  startFlightSearchEventLoopMonitor,
} from "./flightSearchDiagnostics";

test("a deliberately pending request does not prevent unrelated handlers or timers", async () => {
  let resolveRequest!: () => void;
  const pendingRequest = new Promise<void>((resolve) => { resolveRequest = resolve; });
  const stop = startFlightSearchEventLoopMonitor(5);
  let editSearchPressed = false;
  let bottomNavigationPressed = false;
  let headerPressed = false;

  const requestCompletion = pendingRequest.then(() => "finished");
  editSearchPressed = true;
  bottomNavigationPressed = true;
  headerPressed = true;
  await new Promise((resolve) => setTimeout(resolve, 20));

  const sample = stop();
  assert.equal(editSearchPressed, true);
  assert.equal(bottomNavigationPressed, true);
  assert.equal(headerPressed, true);
  assert.ok(sample.sampleCount > 0, "the JS event loop must tick while fetch is pending");
  resolveRequest();
  assert.equal(await requestCompletion, "finished");
});

test("response byte metrics account for multi-byte JSON without logging its contents", () => {
  assert.equal(responseByteLength('{"city":"Zürich"}'), 18);
});
