import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("the eager car location country module evaluates without Intl.DisplayNames", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/validate-hermes-startup.mjs"],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join("\n"));
});
