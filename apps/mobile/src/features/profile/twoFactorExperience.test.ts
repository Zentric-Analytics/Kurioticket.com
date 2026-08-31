import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");

test("security row visibly distinguishes enabled and disabled setup states", () => {
  assert.match(security, /status=\{overview\.twoFactorEnabled \? c\.enabled : undefined\}/);
  assert.match(security, /overview\?\.twoFactorEnabled \? <View/);
  assert.match(security, /label=\{c\.setupTwoFactor\}/);
});

test("closing two-factor setup wipes every sensitive state and invalidates requests", () => {
  const cleanup = security.slice(security.indexOf("const clearTwoFactorState"), security.indexOf("const openTwoFactor"));
  for (const setter of ["setSetup(null)", 'setAuthenticatorCode("")', 'setVerification("")', "setRecoveryCodes([])", 'setTwoFactorError("")'])
    assert.ok(cleanup.includes(setter), `cleanup must include ${setter}`);
  assert.match(security, /closeTwoFactor = \(\) => \{ twoFactorRequest\.current \+= 1;/);
  assert.match(security, /openTwoFactor[^\n]+clearTwoFactorState\(\)/);
});

test("recovery codes are one-time flow state with copy-all and done actions", () => {
  assert.match(security, /Clipboard\.setString\(recoveryCodes\.join\("\\n"\)\)/);
  assert.match(security, /<Button label="Done" onPress=\{closeTwoFactor\}/);
  assert.doesNotMatch(security, /SecureStore|AsyncStorage/);
  assert.match(security, /setRecoveryCodes\(\[\]\)/);
});

test("setup keeps strict verification, dismisses the keyboard, and never renders the URI", () => {
  assert.match(security, /!\/\^\\d\{6\}\$\/\.test\(authenticatorCode\)/);
  assert.match(security, /Keyboard\.dismiss\(\);setRecoveryCodes/);
  assert.match(security, /AccessibilityInfo\.announceForAccessibility\(c\.recoveryHelp\)/);
  assert.match(security, /Clipboard\.setString\(setup\.manualSetupKey\)/);
  assert.doesNotMatch(security, />\{setup\.otpauthUri\}</);
});
