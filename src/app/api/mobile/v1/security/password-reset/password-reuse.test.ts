import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/api/mobile/v1/security/password-reset/route.ts", "utf8");

test("signed-in password reset rejects reusing the current password after code verification", () => {
  assert.match(route, /passwordHash:\s*true/);
  assert.match(route, /user\.passwordHash\s*&&\s*await bcrypt\.compare\(parsed\.data\.newPassword, user\.passwordHash\)/);
  assert.match(route, /Choose a new password that is different from your current password\./);
  assert.match(route, /status:\s*400/);
});
