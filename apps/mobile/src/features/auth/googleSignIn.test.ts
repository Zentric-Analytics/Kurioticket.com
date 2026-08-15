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
  assert.match(nativeSource, /iosClientId/);
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

test("Google configuration is validated before loading the native module", () => {
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const guardIndex = flowSource.indexOf("requireGoogleWebClientId();");
  const importIndex = flowSource.indexOf('await import("./googleSignIn")');
  assert.notEqual(guardIndex, -1);
  assert.notEqual(importIndex, -1);
  assert.ok(guardIndex < importIndex);
});

test("Preview Google rejection resets native selection and forces an explicit chooser on retry", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const flowSource = readFileSync(join(process.cwd(), "src/features/auth/AuthFlow.tsx"), "utf8");
  const apiSource = readFileSync(join(process.cwd(), "src/features/auth/authApi.ts"), "utf8");

  assert.match(nativeSource, /forceAccountSelection/);
  assert.match(nativeSource, /GoogleOneTapSignIn\.presentExplicitSignIn/);
  assert.match(nativeSource, /resetNativeGoogleSignInSelection/);
  assert.match(nativeSource, /GoogleOneTapSignIn\.signOut/);
  assert.match(flowSource, /googleError\.code === "PREVIEW_ACCESS_REQUIRED"/);
  assert.match(flowSource, /setForceGoogleAccountSelection\(true\)/);
  assert.match(flowSource, /resetNativeGoogleSignInSelection\(\)/);
  assert.match(apiSource, /public code = ""/);
});

test("nonce generation, configuration, and backend submission retain the same value", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const nonceCreation = nativeSource.indexOf("const nonce = await createNonce()");
  const configuration = nativeSource.indexOf("GoogleOneTapSignIn.configure", nonceCreation);
  const configuredNonce = nativeSource.indexOf("nonce,", configuration);
  const successResult = nativeSource.indexOf("idToken: response.data.idToken, nonce", configuredNonce);

  assert.ok(nonceCreation > -1 && configuration > nonceCreation);
  assert.ok(configuredNonce > configuration && successResult > configuredNonce);
});

test("iOS operation selection cannot use signIn as its token source", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  assert.match(nativeSource, /getInitialGoogleSignInOperation\(Platform\.OS, forceAccountSelection\)/);
  assert.match(nativeSource, /initialOperation === "presentExplicitSignIn"/);
});

test("Android fallback, cancellation, and DEVELOPER_ERROR behavior remain intact", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  assert.match(nativeSource, /GoogleOneTapSignIn\.signIn\(\)/);
  assert.match(nativeSource, /resolveInteractiveResponse\(initialResponse, run\)/);
  assert.match(nativeSource, /GoogleOneTapSignIn\.createAccount\(\)/);
  assert.match(nativeSource, /isCancelledResponse\(response\)/);
  assert.match(nativeSource, /code === statusCodes\.SIGN_IN_CANCELLED/);
  assert.match(nativeSource, /code === statusCodes\.DEVELOPER_ERROR/);
  assert.match(nativeSource, /Google sign-in is not configured for this Android build\./);
});

test("Preview diagnostics remain in the native Google error path", () => {
  const nativeSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignIn.ts"), "utf8");
  const diagnosticsSource = readFileSync(join(process.cwd(), "src/features/auth/googleSignInDiagnostics.ts"), "utf8");
  assert.match(nativeSource, /formatNativeGoogleError/);
  assert.match(nativeSource, /getRuntimeEnvironment\(\)\.isPreview/);
  assert.match(diagnosticsSource, /Google sign-in failed \(/);
});

test("backend nonce equality remains mandatory", () => {
  const backendSource = readFileSync(
    join(process.cwd(), "../../src/app/api/mobile/v1/auth/google/route.ts"),
    "utf8",
  );
  assert.match(backendSource, /payload\.nonce !== nonce/);
  assert.match(backendSource, /verifyIdToken/);
});
