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

test("email screen has no visible passkey UI, marks the identifier as username, and starts discovery from focus", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  assert.doesNotMatch(screens, /Sign in with passkey|passkeyOption|onPasskey|passkeyLoading/);
  assert.match(screens, /autoComplete="username"/);
  assert.match(screens, /textContentType="username"/);
  assert.match(screens, /onFocus=\{onCredentialFocus\}/);
});

test("email focus starts silent AutoFill-assisted passkey discovery", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const bridge = source("src/features/passkeys/passkeyAutoFill.ts");
  const swift = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");
  const options = flow.indexOf("authApi.passkeyOptions(controller.signal)");
  const autoFill = flow.indexOf("startPasskeyAutoFill({ rpId: options.rpId, challenge: options.challenge })");
  const verify = flow.indexOf("authApi.passkeyVerify(assertion, controller.signal)");
  assert.ok(options > 0 && autoFill > options && verify > autoFill);
  assert.match(flow, /const startSilentPasskeyAutoFill = useCallback/);
  assert.match(flow, /step !== "email" \|\| !isPasskeyAutoFillAvailable\(\)/);
  assert.match(flow, /onCredentialFocus=\{startSilentPasskeyAutoFill\}/);
  assert.doesNotMatch(flow, /getNativePasskey|continuePasskey|passkeyLoading/);
  assert.match(bridge, /Platform\.OS === "ios"/);
  assert.match(swift, /performAutoFillAssistedRequests\(\)/);
  assert.match(swift, /ASAuthorizationPlatformPublicKeyCredentialAssertion/);
  assert.match(swift, /controller\?\.cancel\(\)/);
});

test("AutoFill discovery stays silent and is cancelled when the email flow is left", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /AutoFill-assisted discovery is intentionally silent/);
  assert.match(flow, /const stopPasskeyAutoFill = useCallback/);
  assert.match(flow, /if \(step === "email"\) return;\s*stopPasskeyAutoFill\(\)/);
  assert.match(flow, /useEffect\(\(\) => \(\) => stopPasskeyAutoFill\(\)/);
  assert.doesNotMatch(flow, /No Kurioticket passkey was found|Too many passkey attempts|Passkey sign-in could not be completed/);
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
