import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/mobile/v1/auth/forgot-password/route.ts", "utf8");

test("mobile forgot password no longer delegates to the web reset-link service", () => {
  assert.doesNotMatch(route, /sendPasswordResetLink/);
  assert.match(route, /action: z\.literal\("send-code"\)/);
  assert.match(route, /action: z\.literal\("reset"\)/);
});

test("recovery code delivery must succeed before the API reports success", () => {
  assert.match(route, /await sendTransactionalEmail/);
  assert.match(route, /Unable to send the verification code\. Try again\./);
  assert.match(route, /status: 503/);
  assert.match(route, /return NextResponse\.json\(\{ ok: true, expiresInMinutes: 5 \}\)/);
});

test("recovery uses the prior verified-email proof and a dedicated challenge", () => {
  assert.match(route, /mobile-verified:/);
  assert.match(route, /mobile-forgot-password/);
  assert.match(route, /maxAttempts = 5/);
  assert.match(route, /challengeTtlMs = 5 \* 60 \* 1000/);
  assert.match(route, /attempts \+ 1 >= maxAttempts/);
});

test("successful recovery rejects password reuse and revokes existing sessions", () => {
  assert.match(route, /bcrypt\.compare\(parsed\.data\.newPassword, user\.passwordHash\)/);
  assert.match(route, /Choose a new password that is different from your current password\./);
  assert.match(route, /sessionVersion: \{ increment: 1 \}/);
  assert.match(route, /revokeReason: "password_reset"/);
  assert.match(route, /type: "PASSWORD_RESET"/);
});
