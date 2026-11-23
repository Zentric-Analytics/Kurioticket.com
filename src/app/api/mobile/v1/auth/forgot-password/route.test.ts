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

test("recovery send requires prior verified-email proof and uses a dedicated challenge", () => {
  assert.match(route, /mobile-verified:/);
  assert.match(route, /verifiedUser\(parsed\.data\.email, parsed\.data\.verificationToken\)/);
  assert.match(route, /mobile-forgot-password/);
  assert.match(route, /maxAttempts = 5/);
  assert.match(route, /challengeTtlMs = 5 \* 60 \* 1000/);
  assert.match(route, /attempts \+ 1 >= maxAttempts/);
});

test("passwordless active accounts can receive and complete recovery", () => {
  assert.match(route, /where: \{ email, status: "ACTIVE" \}/);
  assert.doesNotMatch(route, /passwordHash: \{ not: null \}/);
  assert.match(route, /if \(!user\?\.email\)/);
  assert.match(route, /if \(user\.passwordHash && await bcrypt\.compare/);
});

test("issued recovery code remains valid for its full challenge lifetime", () => {
  const resetBranch = route.slice(route.indexOf("// Sending the recovery code required"));
  assert.match(resetBranch, /activeUser\(parsed\.data\.email\)/);
  assert.doesNotMatch(resetBranch, /verifiedUser\(/);
  assert.doesNotMatch(resetBranch, /proof\.expires/);
  assert.match(resetBranch, /challenge\.expiresAt <= new Date\(\)/);
});

test("successful recovery rejects password reuse and revokes existing sessions", () => {
  assert.match(route, /user\.passwordHash && await bcrypt\.compare\(parsed\.data\.newPassword, user\.passwordHash\)/);
  assert.match(route, /Choose a new password that is different from your current password\./);
  assert.match(route, /sessionVersion: \{ increment: 1 \}/);
  assert.match(route, /revokeReason: "password_reset"/);
  assert.match(route, /type: "PASSWORD_RESET"/);
});
