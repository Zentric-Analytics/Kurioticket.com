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

test("passkey challenge is prefetched while Welcome is visible", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /PASSKEY_OPTIONS_REFRESH_MS = 4 \* 60_000/);
  assert.match(flow, /authApi\.passkeyOptions\(controller\.signal\)/);
  assert.match(flow, /setPasskeyOptions\(options\)/);
  assert.match(flow, /setPasskeyOptionsAcquiredAt\(Date\.now\(\)\)/);
  assert.match(flow, /if \(step === "welcome"\) return <AuthWelcomeScreen/);
  assert.doesNotMatch(flow, /PASSKEY_AUTOFILL_FOCUS_FALLBACK_MS|startSilentPasskeyAutoFill|waitForPasskeyAutoFillStart/);
});

test("passkey challenge freshness is anchored to acquisition time across Welcome and Email", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /PASSKEY_EMAIL_REFRESH_AGE_MS = 3 \* 60_000/);
  assert.match(flow, /PASSKEY_OPTIONS_RETRY_MS = 30_000/);
  assert.match(flow, /Date\.now\(\) - passkeyOptionsAcquiredAt/);
  assert.match(flow, /step === "email" && age >= PASSKEY_EMAIL_REFRESH_AGE_MS/);
  assert.match(flow, /PASSKEY_OPTIONS_REFRESH_MS - age/);
  assert.match(flow, /Date\.now\(\) - passkeyOptionsAcquiredAt < PASSKEY_OPTIONS_REFRESH_MS/);
  assert.match(flow, /passkeyOptions=\{emailPasskeyOptions\}/);
});

test("iOS email uses a native username field that owns AutoFill and focus", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  const wrapper = source("src/features/passkeys/NativePasskeyUsernameField.tsx");
  const swiftView = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift");
  const module = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyAutoFillModule.swift");

  assert.match(screens, /isNativePasskeyUsernameFieldAvailable\(\)/);
  assert.match(screens, /<NativePasskeyUsernameField/);
  assert.match(screens, /rpId=\{passkeyOptions\?\.rpId\}/);
  assert.match(screens, /challenge=\{passkeyOptions\?\.challenge\}/);
  assert.match(screens, /onPasskey=\{onPasskey\}/);
  assert.doesNotMatch(screens, /Sign in with passkey|passkeyOption|passkeyLoading/);

  assert.match(wrapper, /requireNativeViewManager<NativeProps>\("KurioticketPasskeyAutoFill"\)/);
  assert.match(wrapper, /diagnosticsEnabled=\{diagnosticsEnabled\}/);
  assert.match(wrapper, /\[passkey-autofill\]/);

  assert.match(module, /View\(KurioticketPasskeyUsernameView\.self\)/);
  assert.match(module, /Events\("onChangeText", "onFocus", "onBlur", "onSubmit", "onPasskey", "onDiagnostic"\)/);
  assert.match(swiftView, /textField\.textContentType = \.username/);
  assert.match(swiftView, /controller\.performAutoFillAssistedRequests\(\)[\s\S]*focusIfNeeded\(\)/);
  assert.doesNotMatch(swiftView, /DispatchQueue\.main\.asyncAfter\(deadline: \.now\(\) \+ 0\.35/);
});

test("native username view keeps AuthenticationServices controller alive and returns the assertion", () => {
  const swiftView = source("modules/kurioticket-passkey-autofill/ios/KurioticketPasskeyUsernameView.swift");
  assert.match(swiftView, /private var authorizationController: ASAuthorizationController\?/);
  assert.match(swiftView, /authorizationController = controller/);
  assert.match(swiftView, /guard authorizationController === controller else \{ return \}/);
  assert.match(swiftView, /ASAuthorizationPlatformPublicKeyCredentialAssertion/);
  assert.match(swiftView, /onPasskey\(result\)/);
  assert.match(swiftView, /active\?\.cancel\(\)/);
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
  assert.doesNotMatch(flow, /No Kurioticket passkey was found|Too many passkey attempts|Passkey sign-in could not be completed/);
  assert.match(api, /passkeyVerify:[\s\S]*if \(signal\?\.aborted\) throw new AuthApiError\("Passkey sign-in cancelled\.", 0, "ABORTED"\)/);
  assert.match(api, /await writeSession\([\s\S]*if \(signal\?\.aborted\) \{\s*await clearSession\(\)/);
});

test("Google two-factor flow stores the API challenge token", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /const authResult = await authApi\.google\(result\.idToken, result\.nonce\)/);
  assert.match(flow, /setChallengeToken\(authResult\.challengeToken\)/);
  assert.doesNotMatch(flow, /setChallengeToken\(result\.challengeToken\)/);
});

test("existing native passkey adapter remains available for registration and management", () => {
  const adapter = source("src/features/passkeys/nativePasskeys.ts");
  assert.match(adapter, /await module\.get\(options\)/);
  assert.match(adapter, /createNativePasskey/);
  assert.match(adapter, /normalizePasskeyAssertion/);
});
