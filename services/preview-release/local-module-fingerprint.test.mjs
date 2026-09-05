import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { classifyChangeSet } from "./classifier.mjs";
import { classifyPreviewPlatform } from "../../apps/mobile/scripts/preview-delivery-contract.mjs";

const require = createRequire(import.meta.url);
const configPath = resolve(import.meta.dirname, "../../apps/mobile/fingerprint.config.js");
const podspecPath = resolve(import.meta.dirname, "../../apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFill.podspec");

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

test("passkey native module includes a CocoaPods spec for Expo Apple autolinking", () => {
  const podspec = readFileSync(podspecPath, "utf8");
  assert.match(podspec, /s\.name\s*=\s*['"]KurioticketPasskeyAutoFill['"]/);
  assert.match(podspec, /s\.dependency\s+['"]ExpoModulesCore['"]/);
  assert.match(podspec, /s\.source_files\s*=\s*['"]\*\*\/\*\.\{h,m,mm,swift,hpp,cpp\}['"]/);
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

test("Preview delivery contract forces an iOS build for local module Swift and podspec changes", () => {
  for (const file of [
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift",
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFill.podspec",
  ]) {
    const result = classifyPreviewPlatform({
      platform: "ios",
      files: [file],
      baselineFingerprint: "same",
      targetFingerprint: "same",
    });
    assert.equal(result.decision, "NATIVE_BUILD_REQUIRED");
    assert.equal(result.reason, "native-sensitive-range");
    assert.deepEqual(result.nativeFiles, [file]);
  }
});

test("local iOS passkey module changes do not force an Android build", () => {
  const result = classifyPreviewPlatform({
    platform: "android",
    files: ["apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift"],
    baselineFingerprint: "same",
    targetFingerprint: "same",
  });
  assert.equal(result.decision, "OTA_COMPATIBLE");
  assert.deepEqual(result.nativeFiles, []);
});
