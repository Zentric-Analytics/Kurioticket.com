import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) { return readFileSync(new URL(path, import.meta.url), "utf8"); }

test("real account security transitions record canonical events after successful mutation", () => {
  const cases = [
    ["../app/api/account/security/password/route.ts", "security:password-changed", "const updatedUser = await prisma.user.update", "recordAccountEventSafely"],
    ["../app/api/auth/reset-password/route.ts", "security:password-reset-completed", "resetPasswordWithToken", "recordAccountEventSafely"],
    ["../app/api/account/security/passkeys/register/verify/route.ts", "security:passkey-added", "const passkey = await prisma.$transaction", "recordAccountEventSafely"],
    ["../app/api/account/security/passkeys/[id]/route.ts", "security:passkey-removed", "const removed = await", "recordAccountEventSafely"],
    ["../app/api/account/security/two-factor/confirm/route.ts", "security:2fa-enabled", "confirmTotpSetup", "recordAccountEventSafely"],
    ["../app/api/account/security/two-factor/disable/route.ts", "security:2fa-disabled", "disableTwoFactor", "recordAccountEventSafely"],
    ["../app/api/account/security/two-factor/recovery-codes/regenerate/route.ts", "security:2fa-recovery-codes-regenerated", "regenerateRecoveryCodes", "recordAccountEventSafely"],
    ["../app/api/account/email-change/confirm/route.ts", "account:email-changed", "await prisma.$transaction", "recordAccountEventSafely"],
  ] as const;
  for (const [path, eventKey, mutation, notifier] of cases) {
    const text = source(path);
    assert.ok(text.includes(eventKey), `${path} has deterministic event key`);
    assert.ok(text.indexOf(mutation) < text.lastIndexOf(notifier), `${path} notifies after mutation`);
  }
  const profile = source("../app/api/mobile/v1/profile/route.ts");
  assert.ok(profile.indexOf("userProfile.upsert") < profile.lastIndexOf("createNotificationEvent"));
  assert.match(profile, /account:phone-changed/);
  assert.doesNotMatch(profile.match(/createNotificationEvent\(\{[^;]+/s)?.[0] || "", /phoneNumber|phoneCountryCode/);

  const deletion = source("./accountDeletionService.ts");
  assert.match(deletion, /account-deletion:\$\{request\.id\}:requested/);
  assert.match(deletion, /account-deletion:\$\{request\.id\}:cancelled/);
  assert.ok(deletion.indexOf("const request = await db.$transaction") < deletion.indexOf("account-deletion:${request.id}:requested"));
});

test("security notification content and metadata exclude credential material", () => {
  const paths = ["../app/api/account/security/passkeys/register/verify/route.ts", "../app/api/account/security/passkeys/[id]/route.ts", "../app/api/account/security/two-factor/confirm/route.ts", "../app/api/account/security/two-factor/disable/route.ts", "../app/api/account/security/two-factor/recovery-codes/regenerate/route.ts", "../app/api/account/security/password/route.ts", "../app/api/auth/reset-password/route.ts"];
  for (const path of paths) {
    const notificationCalls = source(path).match(/recordAccountEventSafely\(\{[^;]+/gs) || [];
    assert.ok(notificationCalls.length > 0, `${path} records an event`);
    for (const call of notificationCalls) {
      assert.doesNotMatch(call, /publicKey|credentialId|manualSetupKey|otpauthUri|twoFactorSecret|recoveryCodes\s*[:,]|currentPassword|newPassword|resetToken|\bcode\s*[:,]/);
      assert.match(call, /type: "SECURITY_UPDATE"/);
      assert.match(call, /actionPath: "\/settings"/);
    }
  }
});

test("record-only session activity endpoints do not create misleading security events", () => {
  for (const path of ["../app/api/account/security/sessions/revoke/route.ts", "../app/api/account/security/sessions/current/revoke/route.ts"]) {
    const text = source(path);
    assert.match(text, /revocationMode: "record-only"/);
    assert.doesNotMatch(text, /recordAccountEvent|createNotificationEvent/);
  }
});
