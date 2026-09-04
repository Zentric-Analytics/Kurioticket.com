import assert from "node:assert/strict";
import test from "node:test";
import { classifyChangeSet } from "./classifier.mjs";

const moduleRoot = "apps/mobile/modules/kurioticket-passkey-autofill";

test("local Expo iOS module source is classified as iOS native", () => {
  const result = classifyChangeSet([
    `${moduleRoot}/ios/KurioticketPasskeyAutoFillModule.swift`,
  ]);
  assert.equal(result.classification, "IOS_NATIVE");
  assert.deepEqual(result.uncertainMobile, undefined);
});

test("local Expo Android module source is classified as Android native", () => {
  const result = classifyChangeSet([
    `${moduleRoot}/android/src/main/java/com/kurioticket/PasskeyAutoFillModule.kt`,
  ]);
  assert.equal(result.classification, "ANDROID_NATIVE");
  assert.deepEqual(result.uncertainMobile, undefined);
});

test("module metadata follows the platform source changed in the same module", () => {
  const ios = classifyChangeSet([
    `${moduleRoot}/expo-module.config.json`,
    `${moduleRoot}/ios/KurioticketPasskeyAutoFillModule.swift`,
  ]);
  assert.equal(ios.classification, "IOS_NATIVE");

  const android = classifyChangeSet([
    `${moduleRoot}/expo-module.config.json`,
    `${moduleRoot}/android/src/main/java/com/kurioticket/PasskeyAutoFillModule.kt`,
  ]);
  assert.equal(android.classification, "ANDROID_NATIVE");
});

test("standalone local Expo module metadata is conservatively native on both platforms", () => {
  const result = classifyChangeSet([
    `${moduleRoot}/expo-module.config.json`,
  ]);
  assert.equal(result.classification, "ANDROID_NATIVE+IOS_NATIVE");
});

test("the merged passkey AutoFill change set no longer fails closed as uncertain mobile", () => {
  const result = classifyChangeSet([
    `${moduleRoot}/expo-module.config.json`,
    `${moduleRoot}/ios/KurioticketPasskeyAutoFillModule.swift`,
    "apps/mobile/src/features/auth/AuthFlow.tsx",
    "apps/mobile/src/features/auth/AuthFormScreens.tsx",
    "apps/mobile/src/features/auth/authApi.ts",
    "apps/mobile/src/features/auth/passkeySignIn.test.ts",
    "apps/mobile/src/features/passkeys/passkeyAutoFill.ts",
  ]);
  assert.equal(result.classification, "IOS_NATIVE");
  assert.deepEqual(result.uncertainMobile, undefined);
});
