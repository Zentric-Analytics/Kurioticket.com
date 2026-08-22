import assert from "node:assert/strict";
import test from "node:test";
import { parseDealsHandoffRequestMode } from "./dealsHandoffRequestMode";

test("only absence and the exact guided string select active request modes", () => {
  assert.equal(parseDealsHandoffRequestMode(undefined), "legacy");
  assert.equal(parseDealsHandoffRequestMode("guided"), "guided");
  assert.equal(parseDealsHandoffRequestMode("guided-v2"), "guided-v2");
  for (const value of [
    "",
    "anything",
    [],
    ["guided"],
    ["guided", "guided"],
    ["guided", "anything"],
    ["anything", "guided"],
    ["anything"],
  ]) {
    assert.equal(parseDealsHandoffRequestMode(value), "invalid");
  }
});
