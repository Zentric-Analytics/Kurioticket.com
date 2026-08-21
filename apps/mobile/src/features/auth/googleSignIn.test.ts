import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { getGoogleIosClientId } from "./googleConfig";

test("Google sign-in uses native Credential Manager with nonce and server exchange", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const apiSource = readFileSync(join(process.cwd(), "src/features/auth/authApi.ts"), "utf8");
  assert.match(nativeSource, /GoogleOneTapSignIn\.checkPlayServices/);
  assert.match(nativeSource, /nonce/);
  assert.match(nativeSource, /const iosClientId = getGoogleIosClientId\(\)/);
  assert.match(nativeSource, /iosClientId: iosClientId \|\| undefined/);
  assert.match(nativeSource, /isCancelledResponse/);
  assert.match(flowSource, /startNativeGoogleSignIn/);
  assert.match(apiSource, /"google"/);
  assert.doesNotMatch(flowSource, /Google sign-in unavailable/);
});

test("Production iOS runtime uses its configured OAuth client without changing Android fallback", () => {
  const previous = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  try {
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "  production-ios.apps.googleusercontent.com  ";
    assert.equal(getGoogleIosClientId(), "production-ios.apps.googleusercontent.com");
    delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    assert.equal(getGoogleIosClientId(), "");
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = previous;
  }

  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  assert.match(nativeSource, /webClientId,/);
  assert.match(nativeSource, /iosClientId: iosClientId \|\| undefined/);
  assert.match(nativeSource, /GoogleOneTapSignIn\.checkPlayServices\(true\)/);
  assert.match(nativeSource, /GoogleOneTapSignIn\.signIn\(\)/);
});

test("authentication startup does not eagerly initialize the Google native module", () => {
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  assert.doesNotMatch(flowSource, /^import .*\.\/googleSignIn/m);
  assert.match(flowSource, /await import\("\.\/googleSignIn"\)/);
});

test("Google configuration is validated before loading the native module", () => {
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const guardIndex = flowSource.indexOf("requireGoogleWebClientId();");
  const importIndex = flowSource.indexOf('await import("./googleSignIn")');
  assert.notEqual(guardIndex, -1);
  assert.notEqual(importIndex, -1);
  assert.ok(guardIndex < importIndex);
});
