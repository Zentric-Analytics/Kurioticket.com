import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flow = readFileSync("src/features/profile/TwoFactorEnabledFlow.tsx", "utf8");
const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const polishCopy = readFileSync("src/features/profile/twoFactorPolishCopy.ts", "utf8");

test("enabled two-factor opens on a status overview before verification", () => {
  assert.match(flow, /type Stage = "overview" \| "verify"/);
  assert.match(flow, /useState<Stage>\("overview"\)/);
  assert.match(flow, /setStage\("verify"\)/);
  assert.match(flow, /Two-factor authentication is on/);
  assert.match(flow, /Your account is protected with an authenticator app\./);
  assert.match(flow, /Authenticator app/);
});

test("two-factor disable verification defaults to one authenticator field", () => {
  assert.match(flow, /useState<VerificationMethod>\("authenticator"\)/);
  assert.match(flow, /Use another verification method/);
  assert.match(flow, /keyboardType=\{method === "authenticator" \? "number-pad" : "default"\}/);
  assert.match(flow, /secureTextEntry=\{method === "password" && passwordHidden\}/);
  assert.match(flow, /placeholder=\{placeholder\}/);
});

test("alternate verification methods use a compact bottom sheet instead of expanding inline", () => {
  assert.match(flow, /<Modal animationType="fade" presentationStyle="overFullScreen" transparent visible=\{showMethods\}/);
  assert.match(flow, /sheetRoot: \{ flex: 1, justifyContent: "flex-end" \}/);
  assert.match(flow, /sheetBackdrop: \{ \.\.\.StyleSheet\.absoluteFillObject/);
  assert.match(flow, /\{polish\.verifyAnotherWay\}/);
  assert.match(polishCopy, /verifyAnotherWay: "Verify another way"/);
  assert.doesNotMatch(flow, /methodPicker:/);
  assert.doesNotMatch(flow, /\{f\.chooseMethod\}<\/Text>/);
});

test("selecting another method replaces the single credential field", () => {
  assert.match(flow, /const chooseMethod = \(next: VerificationMethod\)/);
  assert.match(flow, /setMethod\(next\)/);
  assert.match(flow, /setVerification\(""\)/);
  assert.match(flow, /setShowMethods\(false\)/);
  assert.match(flow, /method !== "recovery" \? <MethodOption title=\{f\.recoveryCode\}/);
  assert.match(flow, /method !== "authenticator" \? <MethodOption title=\{f\.authenticatorApp\}/);
});

test("password verification is available only when the account has a password", () => {
  assert.match(security, /hasPassword=\{Boolean\(overview\?\.hasPassword\)\}/);
  assert.match(flow, /hasPassword: boolean/);
  assert.match(flow, /if \(!hasPassword && method === "password"\)/);
  assert.match(flow, /\{hasPassword && method !== "password" \? <MethodOption title=\{f\.password\}/);
});

test("two-factor verification errors belong to the credential field", () => {
  assert.match(flow, /fieldFeedback/);
  assert.match(flow, /fieldError \? <Text accessibilityRole="alert"/);
  assert.match(flow, /Authenticator code is incorrect\./);
  assert.match(flow, /Recovery code is incorrect\./);
  assert.match(flow, /Password is incorrect\./);
});

test("security uses the polished enabled flow without landing-page disable feedback", () => {
  assert.match(security, /<TwoFactorEnabledFlow/);
  assert.match(security, /onDisabled=\{async \(\) => \{ closeTwoFactor\(\); await load\(\{showLandingFeedback:false,showLoading:false\}\); \}\}/);
  assert.doesNotMatch(security, /const message=`\$\{c\.twoFactor\}: \$\{c\.disabled\}`/);
});
