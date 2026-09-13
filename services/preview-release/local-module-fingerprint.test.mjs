import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { classifyChangeSet } from "./classifier.mjs";
import { classifyPreviewPlatform } from "../../apps/mobile/scripts/preview-delivery-contract.mjs";

const require = createRequire(import.meta.url);
const configPath = resolve(import.meta.dirname, "../../apps/mobile/fingerprint.config.js");
const passkeyPodspecPath = resolve(import.meta.dirname, "../../apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFill.podspec");
const lookAroundPodspecPath = resolve(import.meta.dirname, "../../apps/mobile/modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAround.podspec");

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

test("Preview iOS fingerprint explicitly hashes both local Apple native modules", () => {
  const config = loadConfig("ios");
  assert.deepEqual(config.extraSources, [
    {
      type: "dir",
      filePath: "modules/kurioticket-passkey-autofill",
      reasons: ["Kurioticket local iOS passkey AutoFill native module"],
    },
    {
      type: "dir",
      filePath: "modules/kurioticket-hotel-look-around",
      reasons: ["Kurioticket local iOS hotel Look Around native module"],
    },
  ]);
});

test("Apple-only local modules do not extend the Android fingerprint", () => {
  assert.deepEqual(loadConfig("android").extraSources, []);
});

test("local Apple native modules include CocoaPods specs for Expo autolinking", () => {
  const passkeyPodspec = readFileSync(passkeyPodspecPath, "utf8");
  assert.match(passkeyPodspec, /s\.name\s*=\s*['"]KurioticketPasskeyAutoFill['"]/);
  assert.match(passkeyPodspec, /s\.dependency\s+['"]ExpoModulesCore['"]/);
  assert.match(passkeyPodspec, /s\.source_files\s*=\s*['"]\*\*\/\*\.\{h,m,mm,swift,hpp,cpp\}['"]/);

  const lookAroundPodspec = readFileSync(lookAroundPodspecPath, "utf8");
  assert.match(lookAroundPodspec, /s\.name\s*=\s*['"]KurioticketHotelLookAround['"]/);
  assert.match(lookAroundPodspec, /s\.dependency\s+['"]ExpoModulesCore['"]/);
  assert.match(lookAroundPodspec, /s\.frameworks\s*=\s*['"]MapKit['"]/);
  assert.match(lookAroundPodspec, /s\.source_files\s*=\s*['"]\*\*\/\*\.\{h,m,mm,swift,hpp,cpp\}['"]/);
});

test("fingerprint configuration change is classified as iOS native", () => {
  const result = classifyChangeSet(["apps/mobile/fingerprint.config.js"]);
  assert.equal(result.classification, "IOS_NATIVE");
  assert.deepEqual(result.uncertainMobile, undefined);
});

test("local Apple module plus fingerprint configuration remains iOS-only native", () => {
  for (const moduleRoot of ["kurioticket-passkey-autofill", "kurioticket-hotel-look-around"]) {
    const result = classifyChangeSet([
      "apps/mobile/fingerprint.config.js",
      `apps/mobile/modules/${moduleRoot}/expo-module.config.json`,
      `apps/mobile/modules/${moduleRoot}/ios/${moduleRoot === "kurioticket-passkey-autofill" ? "KurioticketPasskeyAutoFillModule.swift" : "KurioticketHotelLookAroundModule.swift"}`,
    ]);
    assert.equal(result.classification, "IOS_NATIVE");
  }
});

test("Preview delivery contract forces an iOS build for local module Swift and podspec changes", () => {
  for (const file of [
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift",
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFill.podspec",
    "apps/mobile/modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundModule.swift",
    "apps/mobile/modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundView.swift",
    "apps/mobile/modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAround.podspec",
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

test("local Apple native module changes do not force an Android build", () => {
  for (const file of [
    "apps/mobile/modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift",
    "apps/mobile/modules/kurioticket-hotel-look-around/ios/KurioticketHotelLookAroundView.swift",
  ]) {
    const result = classifyPreviewPlatform({
      platform: "android",
      files: [file],
      baselineFingerprint: "same",
      targetFingerprint: "same",
    });
    assert.equal(result.decision, "OTA_COMPATIBLE");
    assert.deepEqual(result.nativeFiles, []);
  }
});
