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

test("recovery codes remain one-time selectable state and close through localized UI", () => {
  assert.match(security, /recoveryCodes\.map\(code=><Text key=\{code\} selectable/);
  assert.match(security, /<Button label=\{c\.close\} onPress=\{closeTwoFactor\}\/>/);
  assert.doesNotMatch(security, /Clipboard/);
  assert.doesNotMatch(security, /SecureStore|AsyncStorage/);
  assert.match(security, /setRecoveryCodes\(\[\]\)/);
});

test("setup renders the server URI only into a local QR code and keeps the manual fallback", () => {
  assert.match(security, /import QRCode from "react-native-qrcode-svg"/);
  assert.match(security, /<QRCode value=\{setup\.otpauthUri\} size=\{200\} quietZone=\{12\} backgroundColor="#FFFFFF" \/>/);
  assert.match(security, /accessibilityLabel=\{c\.twoFactorQrAccessibilityLabel\}/);
  assert.match(security, /\{c\.scanQrInstructions\}[^]*\{c\.manualSetupInstructions\}/);
  assert.match(security, /<Text selectable style=\{\[styles\.setupKey/);
  assert.match(security, /\{setup\.manualSetupKey\}<\/Text>/);
  assert.doesNotMatch(security, />\{setup\.otpauthUri\}</);
  assert.doesNotMatch(security, /accessibilityLabel=\{setup\.(?:otpauthUri|manualSetupKey)\}/);
});

test("setup remains ephemeral and disappears whenever sensitive setup state is cleared", () => {
  assert.match(security, /: setup \? <View[^]*<QRCode value=\{setup\.otpauthUri\}/);
  assert.match(security, /setRecoveryCodes\(result\.recoveryCodes\);setSetup\(null\);setAuthenticatorCode\(""\)/);
  assert.doesNotMatch(security, /console\.(?:log|info|debug|warn|error)/);
  assert.doesNotMatch(security, /(?:SecureStore|AsyncStorage|persist|cache).*?(?:otpauthUri|manualSetupKey|authenticatorCode|recoveryCodes)/i);
});

test("setup keeps strict verification and dismisses the keyboard", () => {
  assert.match(security, /!\/\^\\d\{6\}\$\/\.test\(authenticatorCode\)/);
  assert.match(security, /Keyboard\.dismiss\(\);setRecoveryCodes/);
  assert.match(security, /AccessibilityInfo\.announceForAccessibility\(c\.recoveryHelp\)/);
});

test("successful disable closes the sensitive flow and surfaces localized disabled feedback", () => {
  assert.match(security, /const message=`\$\{c\.twoFactor\}: \$\{c\.disabled\}`/);
  assert.match(security, /closeTwoFactor\(\);setLandingMessage\(message\);AccessibilityInfo\.announceForAccessibility\(message\)/);
});
