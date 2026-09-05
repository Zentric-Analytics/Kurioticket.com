import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { classifyChangeSet } from "./classifier.mjs";

const require = createRequire(import.meta.url);
const configPath = resolve(import.meta.dirname, "../../apps/mobile/fingerprint.config.js");

function loadConfig(platform) {
  const previous = process.env.EAS_BUILD_PLATFORM;
  process.env.EAS_BUILD_PLATFORM = platform;
  delete require.cache[require.resolve(configPath)];
  try {
    return require(configPath);
  } finally {
    delete require.cache[require.resolve(configPath)];
    if (previous === undefined) delete process.env.EAS_BUILD_PLATFORM;
    else process.env.EAS_BUILD_PLATFORM = previous;
  }
}

test("Preview iOS fingerprint explicitly hashes the local passkey native module", () => {
  const config = loadConfig("ios");
  assert.deepEqual(config.extraSources, [
    {
      type: "dir",
      filePath: "modules/kurioticket-passkey-autofill",
      reasons: ["Kurioticket local iOS passkey AutoFill native module"],
    },
  ]);
});

test("Apple-only passkey module does not extend the Android fingerprint", () => {
  assert.deepEqual(loadConfig("android").extraSources, []);
});

test("fingerprint configuration change is classified as iOS native", () => {
  const result = classifyChangeSet(["apps/mobile/fingerprint.config.js"]);
  assert.equal(result.classification, "IOS_NATIVE");
  assert.deepEqual(result.uncertainMobile, undefined);
});

test("passkey module plus fingerprint configuration remains iOS-only native", () => {
  const result = classifyChangeSet([
    "apps/mobile/fingerprint.config.js",
    "apps/mobile/modules/kurioticket-passkey-autofill/expo-module.config.json",
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift",
  ]);
  assert.equal(result.classification, "IOS_NATIVE");
});
