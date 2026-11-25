import assert from "node:assert/strict";
import test from "node:test";
import { rememberCarResultsReturn, readCarResultsReturn } from "./carResultsReturnSnapshot";

test("car return snapshot uses original request ID without a provider search", () => {
  const key = "pickup=Lagos|return=Abuja";
  rememberCarResultsReturn(key, [{ id: "car-1" }] as never, "request-1", 100);
  const first = readCarResultsReturn(key, 101);
  assert.equal(first?.results[0]?.id, "car-1");
  assert.equal(first?.requestId, "request-1");
  assert.equal(readCarResultsReturn("other", 102), null);
});
test("car snapshots expire; reads never extend provider validity", () => {
  rememberCarResultsReturn("short", [{ id: "car-2" }] as never, "request-2", 100);
  assert.equal(readCarResultsReturn("short", 100 + 5 * 60_000), null);
  assert.equal(readCarResultsReturn("short"), null);
});
