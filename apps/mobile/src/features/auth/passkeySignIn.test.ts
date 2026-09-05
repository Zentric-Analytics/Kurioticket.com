import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("welcome keeps passkeys out of the top-level auth choices", () => {
  const welcome = source("src/features/auth/AuthWelcomeScreen.tsx");
  for (const label of ["Continue with Email", "Continue with Google", "Continue as Guest"]) {
    assert.match(welcome, new RegExp(label));
  }
  assert.doesNotMatch(welcome, /Continue with passkey|Sign in with passkey|onPasskey/);
});

test("email screen has no visible passkey UI, marks the identifier as username, and focuses only after discovery is primed", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  assert.doesNotMatch(screens, /Sign in with passkey|passkeyOption|onPasskey|passkeyLoading/);
  assert.match(screens, /autoComplete="username"/);
  assert.match(screens, /textContentType="username"/);
  assert.match(screens, /inputRef=\{input\}/);
  assert.match(screens, /Promise\.resolve\(onCredentialReady\?\.\(\)\)\.finally/);
  assert.match(screens, /input\.current\?\.focus\(\)/);
  assert.match(screens, /onFocus=\{onCredentialFocus\}/);
  const emailScreen = screens.slice(screens.indexOf("export function EmailScreen"), screens.indexOf("export function VerificationScreen"));
  assert.doesNotMatch(emailScreen, /autoFocus/);
});

test("email entry primes silent AutoFill-assisted passkey discovery before the username field is focused", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const bridge = source("src/features/passkeys/passkeyAutoFill.ts");
  const swift = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");
  const options = flow.indexOf("authApi.passkeyOptions(controller.signal)");
  const autoFill = flow.indexOf("startPasskeyAutoFill({ rpId: options.rpId, challenge: options.challenge })");
  const active = flow.indexOf("setCredentialAutoFillActive(true)", autoFill);
  const verify = flow.indexOf("authApi.passkeyVerify(assertion, controller.signal)");
  assert.ok(options > 0 && autoFill > options && active > autoFill && verify > active);
  assert.match(flow, /const startSilentPasskeyAutoFill = useCallback\(async/);
  assert.match(flow, /const prepareCredentialAutoFill = useCallback\(async/);
  assert.match(flow, /await startSilentPasskeyAutoFill\(\)/);
  assert.match(flow, /onCredentialReady=\{prepareCredentialAutoFill\}/);
  assert.match(flow, /const handleCredentialFocus = useCallback/);
  assert.doesNotMatch(flow, /getNativePasskey|continuePasskey|passkeyLoading/);
  assert.match(bridge, /Platform\.OS === "ios"/);
  assert.match(swift, /performAutoFillAssistedRequests\(\)/);
  assert.match(swift, /ASAuthorizationPlatformPublicKeyCredentialAssertion/);
});

test("AutoFill challenge refreshes before the five-minute server expiry", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /PASSKEY_AUTOFILL_REFRESH_MS = 4 \* 60_000/);
  assert.match(flow, /setInterval\(\(\) => \{ void startSilentPasskeyAutoFill\(\); \}, PASSKEY_AUTOFILL_REFRESH_MS\)/);
  assert.match(flow, /credentialAutoFillActive/);
});

test("normal email submission cancels and invalidates assisted passkey authentication first", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const requestCode = flow.slice(flow.indexOf("const requestCode"), flow.indexOf("const verify"));
  assert.ok(requestCode.indexOf("setCredentialAutoFillActive(false)") >= 0);
  assert.ok(requestCode.indexOf("stopPasskeyAutoFill()") > requestCode.indexOf("setCredentialAutoFillActive(false)"));
  assert.ok(requestCode.indexOf("authApi.requestCode(normalized)") > requestCode.indexOf("stopPasskeyAutoFill()"));

  const api = source("src/features/auth/authApi.ts");
  assert.match(api, /passkeyVerify:[\s\S]*if \(signal\?\.aborted\) throw new AuthApiError\("Passkey sign-in cancelled\.", 0, "ABORTED"\)/);
  assert.match(api, /await writeSession\([\s\S]*if \(signal\?\.aborted\) \{\s*await clearSession\(\)/);
});

test("AutoFill discovery stays silent and is cancelled when the email flow is left", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /AutoFill-assisted discovery is intentionally silent/);
  assert.match(flow, /Failing to prime AutoFill must not block or alter the normal email flow/);
  assert.match(flow, /const stopPasskeyAutoFill = useCallback/);
  assert.match(flow, /if \(step === "email"\) return;[\s\S]*stopPasskeyAutoFill\(\)/);
  assert.match(flow, /useEffect\(\(\) => \(\) => stopPasskeyAutoFill\(\)/);
  assert.doesNotMatch(flow, /No Kurioticket passkey was found|Too many passkey attempts|Passkey sign-in could not be completed/);
});

test("iOS bridge ignores callbacks from superseded authorization controllers", () => {
  const swift = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");
  assert.match(swift, /guard self\.controller === controller else \{ return \}/);
  assert.match(swift, /finish\(controller: controller, result:/);
  assert.match(swift, /guard controller === completedController else \{ return \}/);
  assert.match(swift, /let activeController = controller/);
  assert.match(swift, /controller = nil[\s\S]*promise = nil[\s\S]*activeController\?\.cancel\(\)/);
});

test("existing native passkey adapter remains available for management and explicit native ceremonies", () => {
  const adapter = source("src/features/passkeys/nativePasskeys.ts");
  assert.match(adapter, /await module\.get\(options\)/);
  assert.match(adapter, /createNativePasskey/);
  assert.match(adapter, /normalizePasskeyAssertion/);
});

test("verification stores the standard session contract", () => {
  const api = source("src/features/auth/authApi.ts");
  assert.match(api, /passkeyVerify:[\s\S]*await writeSession\(\{ \.\.\.result\.session, user: result\.user \}\)/);
  assert.doesNotMatch(api, /passkeySession|passkeyStorage/);
});
