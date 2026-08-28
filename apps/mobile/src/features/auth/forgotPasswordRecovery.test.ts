import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("src/features/auth/authApi.ts", "utf8");
const flow = readFileSync("src/features/auth/AuthFlow.tsx", "utf8");
const screens = readFileSync("src/features/auth/AuthFormScreens.tsx", "utf8");

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

test("reset submits the code and new password then returns to sign in", () => {
  assert.match(api, /resetForgotPassword/);
  assert.match(api, /action: "reset"/);
  assert.match(flow, /await authApi\.resetForgotPassword\(\{ email, verificationToken: proof, \.\.\.input \}\)/);
  assert.match(flow, /setStep\("password"\)/);
  assert.match(flow, /Your password was reset\. Sign in with your new password\./);
});

test("reset action remains pressable and validates on tap", () => {
  assert.match(screens, /<AuthButton label="Reset password" onPress=\{submit\} loading=\{loading\} \/>/);
  assert.match(screens, /Enter the 6-digit verification code\./);
  assert.match(screens, /Your new password must contain at least 8 characters\./);
  assert.match(screens, /Passwords do not match\./);
});
