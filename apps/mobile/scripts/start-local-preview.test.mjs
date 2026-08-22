import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createLocalPreviewInvocation, runLocalPreview } from "./start-local-preview.mjs";

for (const platform of ["win32", "linux", "darwin"]) {
  test(`${platform} uses Node directly and preserves argument boundaries`, () => {
    const invocation = createLocalPreviewInvocation({
      args: [platform === "win32" ? "--android" : "--ios", "--clear"],
      environment: { EXISTING: "value" },
      nodePath: platform === "win32" ? "C:\\Program Files\\nodejs\\node.exe" : "/usr/bin/node",
      expoCliPath: platform === "win32" ? "C:\\repo\\node_modules\\expo\\bin\\cli" : "/repo/node_modules/expo/bin/cli",
    });

    assert.equal(invocation.command, platform === "win32" ? "C:\\Program Files\\nodejs\\node.exe" : "/usr/bin/node");
    assert.deepEqual(invocation.args.slice(1), ["start", platform === "win32" ? "--android" : "--ios", "--clear"]);
    assert.equal(invocation.options.env.EXISTING, "value");
    assert.equal(invocation.options.env.APP_VARIANT, "preview");
    assert.equal(invocation.options.env.APP_BUILD_MODE, "local");
    assert.equal(invocation.options.env.LOCAL_DEVELOPMENT, "true");
    assert.equal("shell" in invocation.options, false);
  });
}

test("non-zero child exits are propagated", () => {
  const child = new EventEmitter();
  const exits = [];
  runLocalPreview({ args: ["--android"], spawnImpl: () => child, exitImpl: (code) => exits.push(code) });
  child.emit("exit", 23, null);
  assert.deepEqual(exits, [23]);
});

test("spawn failures exit non-zero", () => {
  const child = new EventEmitter();
  const exits = [];
  runLocalPreview({ spawnImpl: () => child, exitImpl: (code) => exits.push(code) });
  child.emit("error", new Error("spawn failed"));
  assert.deepEqual(exits, [1]);
});

test("unsupported Expo Web arguments fail closed", () => {
  assert.throws(() => createLocalPreviewInvocation({ args: ["--web"] }), /Expo Web is not a supported/);
  assert.throws(() => createLocalPreviewInvocation({ args: ["-w"] }), /Expo Web is not a supported/);
});
