import assert from "node:assert/strict";
import test from "node:test";
import config from "../../next.config";

test("page generation has a bounded worker budget on shared build hosts", () => {
  assert.equal(config.experimental?.cpus, 2);
  assert.notEqual(config.typescript?.ignoreBuildErrors, true);
});
