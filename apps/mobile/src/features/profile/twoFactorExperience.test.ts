import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const enabledFlow = readFileSync("src/features/profile/TwoFactorEnabledFlow.tsx", "utf8");
const setupFlow = readFileSync("src/features/profile/TwoFactorSetupFlow.tsx", "utf8");
const polishCopy = readFileSync("src/features/profile/twoFactorPolishCopy.ts", "utf8");

test("security row visibly distinguishes enabled and disabled setup states", () => {
  assert.match(security, /status=\{overview\.twoFactorEnabled \? c\.enabled : undefined\}/);
  assert.match(security, /overview\?\.twoFactorEnabled \? \(/);
  assert.match(security, /<TwoFactorEnabledFlow/);
  assert.match(security, /<TwoFactorSetupFlow/);
});

test("closing two-factor setup wipes every sensitive state and invalidates requests", () => {
  const cleanup = security.slice(security.indexOf("const clearTwoFactorState"), security.indexOf("const openTwoFactor"));
  for (const setter of ["setSetup(null)", 'setAuthenticatorCode("")', "setRecoveryCodes([])", 'setTwoFactorError("")'])
    assert.ok(cleanup.includes(setter), `cleanup must include ${setter}`);
  assert.match(security, /closeTwoFactor = \(\) => \{ twoFactorRequest\.current \+= 1;/);
  assert.match(security, /openTwoFactor[^\n]+clearTwoFactorState\(\)/);
  assert.match(enabledFlow, /if \(!active\) reset\(\)/);
  for (const setter of ['setVerification("")', 'setFieldError("")', 'setGeneralError("")', 'setMethod("authenticator")', 'setStage("overview")'])
    assert.ok(enabledFlow.includes(setter), `enabled flow cleanup must include ${setter}`);
});

test("recovery codes are a dedicated completion step with selectable two-column codes", () => {
  assert.match(setupFlow, /if \(recoveryCodes\.length\)/);
  assert.match(setupFlow, /recoveryCodes\.map\(\(code\) =>/);
  assert.match(setupFlow, /<Text selectable style=\{\[styles\.recoveryCodeText/);
  assert.match(setupFlow, /recoveryGrid: \{ flexDirection: "row", flexWrap: "wrap"/);
  assert.match(setupFlow, /width: "48%"/);
  assert.match(setupFlow, /\{p\.saveRecoveryCodesTitle\}/);
  assert.match(setupFlow, /\{p\.recoveryCodesLabel\}/);
  assert.match(setupFlow, /copiedAction === "recoveryCodes" \? p\.copied : p\.copyAllRecoveryCodes/);
  assert.match(setupFlow, /Clipboard\.setString\(formatRecoveryCodesForClipboard\(recoveryCodes\)\)/);
  assert.match(setupFlow, /label=\{p\.savedCodesAction\}/);
  assert.match(polishCopy, /savedCodesAction: "I’ve saved these codes"/);
  assert.doesNotMatch(setupFlow, /SecureStore|AsyncStorage/);
});

test("recovery-code completion outranks the refreshed enabled overview until acknowledged", () => {
  assert.match(security, /active=\{twoFactorOpen && \(!Boolean\(overview\?\.twoFactorEnabled\) \|\| recoveryCodes\.length > 0\)\}/);
  assert.match(security, /overview\?\.twoFactorEnabled \? \([^]*recoveryCodes\.length \? twoFactorSetupFlow : <TwoFactorEnabledFlow/);
  assert.match(setupFlow, /if \(recoveryCodes\.length\)/);
  assert.match(setupFlow, /label=\{p\.savedCodesAction\} onPress=\{onClose\}/);
});

test("initial setup relies on the modal title without opening the keyboard", () => {
  const start = setupFlow.indexOf("if (!setup)");
  const initial = setupFlow.slice(start, setupFlow.indexOf("\n  return <View", start));
  assert.doesNotMatch(initial, /\{c\.twoFactor\}/);
  assert.match(setupFlow, /autoFocus=\{false\}/);
  assert.match(security, /avoidKeyboard/);
  assert.match(security, /<KeyboardAvoidingView/);
});

test("setup renders the server URI only into a local QR code and keeps the manual fallback", () => {
  assert.match(setupFlow, /import QRCode from "react-native-qrcode-svg"/);
  assert.match(setupFlow, /<QRCode value=\{setup\.otpauthUri\} size=\{200\} quietZone=\{12\} backgroundColor="#FFFFFF" \/>/);
  assert.match(setupFlow, /accessibilityLabel=\{c\.twoFactorQrAccessibilityLabel\}/);
  assert.match(setupFlow, /\{c\.scanQrInstructions\}/);
  assert.match(setupFlow, /\{p\.cantScan\}/);
  assert.match(setupFlow, /\{c\.manualSetupInstructions\}/);
  assert.match(setupFlow, /<Text selectable numberOfLines=\{1\} adjustsFontSizeToFit minimumFontScale=\{0\.65\}/);
  assert.match(setupFlow, /Clipboard\.setString\(setup\.manualSetupKey\)/);
  assert.match(setupFlow, /copiedAction === "setupKey" \? p\.copied : p\.copy/);
  assert.match(setupFlow, /\{setup\.manualSetupKey\}<\/Text>/);
  assert.doesNotMatch(setupFlow, />\{setup\.otpauthUri\}</);
});

test("copy actions show localized copied feedback for one second and safely reset", () => {
  assert.match(setupFlow, /useState<"setupKey" \| "recoveryCodes" \| null>\(null\)/);
  assert.match(setupFlow, /showCopiedFeedback\("setupKey"\)/);
  assert.match(setupFlow, /showCopiedFeedback\("recoveryCodes"\)/);
  assert.match(setupFlow, /setTimeout\(\(\) => \{[^]*setCopiedAction\(null\);[^]*\}, 1000\)/);
  assert.match(setupFlow, /if \(copyResetTimer\.current\) clearTimeout\(copyResetTimer\.current\)/);
  assert.match(setupFlow, /return \(\) => \{[^]*clearTimeout\(copyResetTimer\.current\)/);
  assert.doesNotMatch(setupFlow, /Toast/);
});

test("setup remains ephemeral and preserves the existing verification contract", () => {
  assert.match(security, /setRecoveryCodes\(result\.recoveryCodes\);setSetup\(null\);setAuthenticatorCode\(""\)/);
  assert.match(security, /!\/\^\\d\{6\}\$\/\.test\(authenticatorCode\)/);
  assert.match(security, /Keyboard\.dismiss\(\);setRecoveryCodes/);
  assert.match(security, /AccessibilityInfo\.announceForAccessibility\(c\.recoveryHelp\)/);
  assert.match(setupFlow, /textContentType="oneTimeCode"/);
  assert.match(setupFlow, /autoFocus=\{false\}/);
  assert.match(setupFlow, /normalizeAuthenticatorCode\(value\)/);
  assert.doesNotMatch(security + setupFlow, /console\.(?:log|info|debug|warn|error)/);
  assert.doesNotMatch(security + setupFlow, /(?:SecureStore|AsyncStorage|persist|cache).*?(?:otpauthUri|manualSetupKey|authenticatorCode|recoveryCodes)/i);
});

test("successful disable closes the sensitive flow without landing-page feedback", () => {
  assert.match(security, /onDisabled=\{async \(\) => \{ closeTwoFactor\(\); await load\(\{showLandingFeedback:false,showLoading:false\}\); \}\}/);
  assert.doesNotMatch(security, /const message=`\$\{c\.twoFactor\}: \$\{c\.disabled\}`/);
  assert.match(enabledFlow, /AccessibilityInfo\.announceForAccessibility\(message\)/);
});
