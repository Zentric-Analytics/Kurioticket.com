import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

test("Google sign-in uses native Credential Manager with nonce and server exchange", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const apiSource = readFileSync(join(process.cwd(), "src/features/auth/authApi.ts"), "utf8");
  assert.match(nativeSource, /GoogleOneTapSignIn\.checkPlayServices/);
  assert.match(nativeSource, /nonce/);
  assert.match(nativeSource, /isCancelledResponse/);
  assert.match(flowSource, /startNativeGoogleSignIn/);
  assert.match(apiSource, /"google"/);
  assert.doesNotMatch(flowSource, /Google sign-in unavailable/);
});

test("authentication startup does not eagerly initialize the Google native module", () => {
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  assert.doesNotMatch(flowSource, /^import .*\.\/googleSignIn/m);
  assert.match(flowSource, /await import\("\.\/googleSignIn"\)/);
});
