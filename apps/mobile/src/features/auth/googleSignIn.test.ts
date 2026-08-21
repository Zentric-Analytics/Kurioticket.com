import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { resolveGoogleIosClientId } from "./googleConfig";

test("Google sign-in uses native Credential Manager with nonce and server exchange", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const apiSource = readFileSync(join(process.cwd(), "src/features/auth/authApi.ts"), "utf8");
  assert.match(nativeSource, /GoogleOneTapSignIn\.checkPlayServices/);
  assert.match(nativeSource, /nonce/);
  assert.match(nativeSource, /const iosClientId = getGoogleIosClientId\(getRuntimeEnvironment\(\)\.variant, Platform\.OS\)/);
  assert.match(nativeSource, /iosClientId: iosClientId \|\| undefined/);
  assert.match(nativeSource, /isCancelledResponse/);
  assert.match(flowSource, /startNativeGoogleSignIn/);
  assert.match(apiSource, /"google"/);
  assert.doesNotMatch(flowSource, /Google sign-in unavailable/);
});

test("Production iOS runtime accepts only its approved OAuth identity without changing Android", () => {
  const production = "459496589401-b4npe68m8c358rqr79edi7igvi3sauao.apps.googleusercontent.com";
  const preview = "459496589401-gi52kj4fscgf092pasrelkth2mal0mph.apps.googleusercontent.com";
  assert.equal(resolveGoogleIosClientId(`  ${production}  `, "production", "ios"), production);
  assert.throws(() => resolveGoogleIosClientId(preview, "production", "ios"), /does not match the approved release identity/);
  assert.throws(() => resolveGoogleIosClientId(undefined, "production", "ios"), /require EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  assert.equal(resolveGoogleIosClientId(undefined, "production", "android"), "");
  assert.equal(resolveGoogleIosClientId(preview, "production", "android"), preview);

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
