import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("src/features/auth/authApi.ts", "utf8");
const flow = readFileSync("src/features/auth/AuthFlow.tsx", "utf8");
const screens = readFileSync("src/features/auth/AuthFormScreens.tsx", "utf8");
const primitives = readFileSync("src/features/auth/AuthPrimitives.tsx", "utf8");

test("forgot password sends a recovery code before opening the reset form", () => {
  assert.match(api, /sendForgotPasswordCode/);
  assert.match(api, /action: "send-code"/);
  assert.match(flow, /await authApi\.sendForgotPasswordCode\(email, proof\); setStep\("forgotPassword"\)/);
  assert.doesNotMatch(flow, /If an account exists, we sent password reset instructions/);
});

test("forgot password has a native six-digit reset form", () => {
  assert.match(flow, /step === "forgotPassword"/);
  assert.match(flow, /<ForgotPasswordScreen/);
  assert.match(screens, /export function ForgotPasswordScreen/);
  assert.match(screens, /label="Verification code"/);
  assert.match(screens, /maxLength=\{6\}/);
  assert.match(screens, /label="New password"/);
  assert.match(screens, /label="Confirm new password"/);
  assert.match(screens, /label="Reset password"/);
});

test("reset submits the issued recovery code without reusing the older email proof", () => {
  assert.match(api, /resetForgotPassword: \(input: \{ email: string; code: string; newPassword: string; confirmPassword: string \}\)/);
  assert.match(api, /action: "reset"/);
  assert.doesNotMatch(api, /resetForgotPassword: \(input: \{ email: string; verificationToken:/);
  assert.match(flow, /await authApi\.resetForgotPassword\(\{ email, \.\.\.input \}\)/);
  assert.doesNotMatch(flow, /resetForgotPassword\(\{ email, verificationToken: proof/);
  assert.match(flow, /setStep\("password"\)/);
});

test("successful recovery uses one brief reserved status slot instead of a modal alert", () => {
  assert.match(flow, /setResetNotice\("Password reset\. Sign in with your new password\."\)/);
  assert.match(flow, /setTimeout\(\(\) => setResetNotice\(""\), 2000\)/);
  assert.doesNotMatch(flow, /Alert\.alert/);
  assert.match(screens, /<StatusText success=\{Boolean\(notice\)\}>\{notice \|\| error\}<\/StatusText>/);
  assert.doesNotMatch(screens, /<SuccessText>\{notice\}<\/SuccessText><ErrorText>\{error\}<\/ErrorText>/);
  assert.match(primitives, /export function StatusText/);
  assert.match(primitives, /if \(success\) void AccessibilityInfo\.announceForAccessibility\(children\)/);
  assert.match(primitives, /submitSuccess: \{ minHeight: 19/);
  assert.match(primitives, /Animated\.timing\(opacity, \{ toValue: 1, duration: 180/);
});

test("reset action remains pressable and validates on tap", () => {
  assert.match(screens, /<AuthButton label="Reset password" onPress=\{submit\} loading=\{loading\} \/>/);
  assert.match(screens, /Enter the 6-digit verification code\./);
  assert.match(screens, /Your new password must contain at least 8 characters\./);
  assert.match(screens, /Passwords do not match\./);
});

test("auth buttons keep labels centered while showing in-flight activity", () => {
  assert.match(primitives, /\{icon \? <View style=\{styles\.buttonIcon\}>\{icon\}<\/View> : null\}/);
  assert.match(primitives, /<Text style=\{\[styles\.buttonText, secondary && styles\.secondaryText\]\}>\{label\}<\/Text>\{loading \? <ActivityIndicator style=\{styles\.buttonSpinner\}/);
  assert.match(primitives, /buttonContent: \{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" \}/);
  assert.match(primitives, /buttonIcon: \{ position: "absolute", left: 0/);
  assert.match(primitives, /buttonSpinner: \{ position: "absolute", right: 0 \}/);
  assert.doesNotMatch(primitives, /loading \? <ActivityIndicator[^>]*\/> : <Text/);
});
