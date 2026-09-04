import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("welcome keeps passkeys out of the top-level auth choices", () => {
  const welcome = source("src/features/auth/AuthWelcomeScreen.tsx");
  for (const label of ["Continue with Email", "Continue with Google", "Continue as Guest"]) {
    assert.match(welcome, new RegExp(label));
  }
  assert.doesNotMatch(welcome, /Continue with passkey/);
  assert.doesNotMatch(welcome, /onPasskey/);
  assert.match(welcome, /height < 700 && styles\.compactPanel/);
});

test("email sign-in owns the contextual passkey action", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(screens, /Sign in with passkey/);
  assert.match(screens, /onPasskey \? <View style=\{styles\.passkeyOption\}>/);
  assert.match(flow, /step === "email"/);
  assert.match(flow, /onPasskey=\{passkeySupported \? continuePasskey : undefined\}/);
  assert.doesNotMatch(flow, /<AuthWelcomeScreen[^>]*onPasskey=/);
});

test("passkey ceremony remains username-less, ordered, cancellable, and generation protected", () => {
  const flow = source("src/features/auth/AuthFlow.tsx");
  const options = flow.indexOf("authApi.passkeyOptions(controller.signal)");
  const nativeGet = flow.indexOf("getNativePasskey(options, controller.signal)");
  const verify = flow.indexOf("authApi.passkeyVerify(assertion, controller.signal)");
  assert.ok(options > 0 && nativeGet > options && verify > nativeGet);
  assert.match(flow, /if \(passkeyBusy\.current \|\| step !== "email"\) return/);
  assert.match(flow, /generation !== passkeyAttempt\.current/);
  assert.match(flow, /passkeyController\.current\?\.abort/);
  assert.match(flow, /isPasskeyCancellation\(passkeyError\)\) return/);
  assert.match(flow, /No Kurioticket passkey was found on this device/);
  assert.doesNotMatch(flow.slice(options, verify), /email/);
});

test("passkey loading is isolated from normal email submission", () => {
  const screens = source("src/features/auth/AuthFormScreens.tsx");
  const flow = source("src/features/auth/AuthFlow.tsx");
  assert.match(flow, /const \[passkeyLoading, setPasskeyLoading\] = useState\(false\)/);
  assert.match(flow, /setPasskeyLoading\(true\)/);
  assert.match(flow, /setPasskeyLoading\(false\)/);
  assert.match(screens, /loading=\{passkeyLoading\}/);
  assert.match(screens, /loading=\{loading\} disabled=\{!valid \|\| passkeyLoading\}/);
});

test("adapter safely detects old binaries and normalizes every assertion field", () => {
  const adapter = source("src/features/passkeys/nativePasskeys.ts");
  assert.match(adapter, /Old binaries and Expo Go/);
  assert.match(adapter, /await module\.get\(options\)/);
  assert.doesNotMatch(adapter, /module\.get\(\{[^}]*signal/);
  assert.match(adapter, /cannot actively cancel get\(\)/);
  assert.match(adapter, /signal\?\.aborted/);
  for (const field of ["id", "rawId", "clientDataJSON", "authenticatorData", "signature", "userHandle", "authenticatorAttachment", "clientExtensionResults"]) {
    assert.match(adapter, new RegExp(field));
  }
  assert.match(adapter, /extensions !== undefined && extensions !== null/);
  assert.match(adapter, /compact\.includes\("nocredential"\)/);
  assert.doesNotMatch(adapter, /console\.|AsyncStorage|SecureStore/);
});

test("verification stores the standard session contract", () => {
  const api = source("src/features/auth/authApi.ts");
  assert.match(api, /passkeyVerify:[\s\S]*await writeSession\(\{ \.\.\.result\.session, user: result\.user \}\)/);
  assert.doesNotMatch(api, /passkeySession|passkeyStorage/);
});
