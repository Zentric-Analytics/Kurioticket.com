import assert from "node:assert/strict";
import test from "node:test";
import { isCarSaved, setCarSaved } from "./carSavedState";

test("car save state is shared without leaking between result ids", () => {
  setCarSaved("car-a", false);
  setCarSaved("car-b", false);
  setCarSaved("car-a", true);
  assert.equal(isCarSaved("car-a"), true);
  assert.equal(isCarSaved("car-b"), false);
  setCarSaved("car-a", false);
  assert.equal(isCarSaved("car-a"), false);
  assert.equal(isCarSaved("car-b"), false);
});
