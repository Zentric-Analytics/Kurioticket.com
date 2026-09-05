import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("AuthenticationServices delegates use NSObject and cancellation is iOS-version guarded", () => {
  const module = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");
  const view = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift");
  assert.match(module, /class PasskeyAuthorizationDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding/);
  assert.match(module, /class KurioticketPasskeyAutoFillModule: Module \{/);
  assert.match(module, /weak var owner: KurioticketPasskeyAutoFillModule\?/);
  assert.match(module, /private lazy var authorizationDelegate/);
  assert.match(module, /controller\.delegate = self\.authorizationDelegate/);
  assert.match(module, /controller\.presentationContextProvider = self\.authorizationDelegate/);
  for (const [text, receiver] of [[module, "activeController"], [view, "authorizationController"], [view, "active"]]) {
    assert.match(text, new RegExp(`if #available\\(iOS 16\\.0, \\*\\) \\{\\s*${receiver}\\?\\.cancel\\(\\)\\s*\\}`));
  }
});

test("welcome keeps passkeys out of the top-level auth choices", () => {
  const welcome = source("src/features/auth/AuthWelcomeScreen.tsx");
  for (const label of ["Continue with Email", "Continue with Google", "Continue as Guest"]) {
    assert.match(welcome, new RegExp(label));
  }
  assert.doesNotMatch(welcome, /Continue with passkey|Sign in with passkey|onPasskey/);
});

test("iOS native username view is the only passkey sign-in path in AuthFlow", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /isNativePasskeyUsernameFieldAvailable\(\)/);
  assert.match(flow, /authApi\.passkeyOptions\(controller\.signal\)/);
  assert.match(flow, /passkeyOptions=\{emailPasskeyOptions\}/);
  assert.match(flow, /onPasskey=\{continuePasskeyAssertion\}/);
  assert.doesNotMatch(flow, /cancelPasskeyAutoFill|isPasskeyAutoFillAvailable|startPasskeyAutoFill|waitForPasskeyAutoFillStart/);
  assert.doesNotMatch(flow, /LEGACY_PASSKEY_FOCUS_FALLBACK_MS|startLegacyPasskeyAutoFill|prepareLegacyCredentialAutoFill|handleLegacyCredentialFocus/);
  assert.doesNotMatch(flow, /onCredentialReady=|onCredentialFocus=/);
});

test("passkey challenge freshness remains anchored to acquisition time", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /PASSKEY_OPTIONS_REFRESH_MS = 4 \* 60_000/);
  assert.match(flow, /PASSKEY_EMAIL_REFRESH_AGE_MS = 3 \* 60_000/);
  assert.match(flow, /PASSKEY_OPTIONS_RETRY_MS = 30_000/);
  assert.match(flow, /setPasskeyOptionsAcquiredAt\(Date\.now\(\)\)/);
  assert.match(flow, /step === "email" && age >= PASSKEY_EMAIL_REFRESH_AGE_MS/);
  assert.match(flow, /Date\.now\(\) - passkeyOptionsAcquiredAt < PASSKEY_OPTIONS_REFRESH_MS/);
});

test("native username field availability checks registered view metadata", () => {
  const wrapper = source("src/features/passkeys/NativePasskeyUsernameField.tsx");
  assert.match(wrapper, /getViewConfig\?: \(moduleName: string, viewName\?: string\) => unknown \| null/);
  assert.match(wrapper, /expoRuntime\?\.getViewConfig\?\.\("KurioticketPasskeyAutoFill"\)/);
  assert.match(wrapper, /const nativeViewRegistered = hasNativePasskeyUsernameView\(\)/);
  assert.match(wrapper, /return nativeViewRegistered;/);
});

test("native passkey username view owns conditional AutoFill and requires user verification", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  const swiftView = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift");
  const module = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");

  assert.match(screens, /<NativePasskeyUsernameField/);
  assert.match(screens, /rpId=\{passkeyOptions\?\.rpId\}/);
  assert.match(screens, /challenge=\{passkeyOptions\?\.challenge\}/);
  assert.match(screens, /onPasskey=\{onPasskey\}/);
  assert.doesNotMatch(screens, /Continue with passkey|Sign in with passkey|passkeyLoading/);

  assert.match(swiftView, /textField\.textContentType = \.username/);
  assert.match(swiftView, /request\.userVerificationPreference = \.required/);
  assert.match(swiftView, /controller\.performAutoFillAssistedRequests\(\)[\s\S]*focusIfNeeded\(\)/);
  assert.match(swiftView, /ASAuthorizationPlatformPublicKeyCredentialAssertion/);
  assert.match(swiftView, /onPasskey\(result\)/);

  assert.match(module, /request\.userVerificationPreference = \.required/);
});

test("Preview diagnostics expose only safe AuthenticationServices metadata", () => {
  const wrapper = source("src/features/passkeys/NativePasskeyUsernameField.tsx");
  const swiftView = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift");
  assert.match(wrapper, /Constants\.expoConfig\?\.extra\?\.environment\?\.isPreview === true/);
  assert.match(swiftView, /payload\["domain"\] = error\.domain/);
  assert.match(swiftView, /payload\["code"\] = error\.code/);
  assert.match(swiftView, /payload\["rpId"\] = rpId/);
  assert.doesNotMatch(swiftView, /payload\["challenge"\]|payload\["credentialId"\]|payload\["signature"\]/);
});

test("passkey assertion verification remains silent and session-safe", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const api = source("src/features/auth/authApi.ts");
  assert.match(flow, /const continuePasskeyAssertion = useCallback/);
  assert.match(flow, /authApi\.passkeyVerify\(assertion, controller\.signal\)/);
  assert.match(flow, /Selection\/cancellation\/verification failures stay silent/);
  assert.match(api, /passkeyVerify:[\s\S]*if \(signal\?\.aborted\) throw new AuthApiError\("Passkey sign-in cancelled\.", 0, "ABORTED"\)/);
  assert.match(api, /await writeSession\([\s\S]*if \(signal\?\.aborted\) \{\s*await clearSession\(\)/);
});

test("ordinary email submission cancels passkey verification before requesting a code", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const start = flow.indexOf("const requestCode");
  const end = flow.indexOf("const verify", start);
  const requestCode = flow.slice(start, end);
  assert.match(requestCode, /stopPasskeyVerification\(\)/);
  assert.match(requestCode, /authApi\.requestCode\(normalized\)/);
});

test("existing native passkey adapter remains available for registration and management", () => {
  const adapter = source("src/features/passkeys/nativePasskeys.ts");
  assert.match(adapter, /await module\.get\(options\)/);
  assert.match(adapter, /createNativePasskey/);
  assert.match(adapter, /normalizePasskeyAssertion/);
});
