import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  canRequestEmailChange,
  emailChangeErrorKey,
  normalizedEmail,
} from "./emailChangeModel";

test("email draft validation trims addresses and rejects unchanged or malformed input", () => {
  assert.equal(normalizedEmail(" New@Example.COM "), "new@example.com");
  for (const value of [
    "",
    "old@EXAMPLE.com",
    "missing-at",
    "a@b",
    "a b@example.com",
  ])
    assert.equal(canRequestEmailChange(value, "old@example.com"), false);
  assert.equal(
    canRequestEmailChange(" new@example.com ", "old@example.com"),
    true,
  );
});
test("verification failures have distinct actionable UI messages", () => {
  assert.equal(emailChangeErrorKey(400, "INVALID_CODE"), "emailInvalidCode");
  assert.equal(emailChangeErrorKey(400, "EXPIRED_CODE"), "emailExpiredCode");
  assert.equal(emailChangeErrorKey(409, "EMAIL_IN_USE"), "emailInUse");
  assert.equal(emailChangeErrorKey(429, "RATE_LIMITED"), "emailRateLimited");
  assert.equal(emailChangeErrorKey(503, "UNAVAILABLE"), "emailUnavailable");
  assert.equal(emailChangeErrorKey(0, undefined), "emailUnavailable");
});
test("email changes use verification, authoritative results, and account-scoped local identity", () => {
  const editor = readFileSync(
    "src/features/personal-details/PersonalDetailsEmailEditor.tsx",
    "utf8",
  );
  const storage = readFileSync("src/storage/sessionStorage.ts", "utf8");
  assert.match(
    editor,
    /travelApi.requestEmailChange\(target, ownershipProof\)/,
  );
  assert.match(
    editor,
    /travelApi.confirmEmailChange\(\s*requestedEmail,\s*code,\s*ownershipProof,?\s*\)/,
  );
  assert.match(
    editor,
    /updateStoredSessionEmail\(result.email, result.userId\)/,
  );
  assert.match(editor, /onSaved\(result.email\)/);
  assert.doesNotMatch(
    editor,
    /updateProfile|openBrowser|openSafeExternalUrl|clearSession/,
  );
  assert.match(
    storage.slice(
      storage.indexOf("export async function updateStoredSessionEmail"),
    ),
    /session.user.id !== expectedUserId/,
  );
});
test("verification supports autofill, prevents duplicate submissions, and cleans up its resend timer", () => {
  const editor = readFileSync(
    "src/features/personal-details/PersonalDetailsEmailEditor.tsx",
    "utf8",
  );
  assert.match(editor, /one-time-code/);
  assert.match(editor, /pending.current/);
  assert.match(editor, /retryAfterSeconds/);
  assert.match(editor, /clearInterval\(timer\)/);
  assert.match(editor, /failure.status === 401/);
  assert.match(editor, /onBusyChange\(true\)/);
  assert.match(editor, /<PersonalDetailsSaveButton/);
  assert.ok(editor.indexOf("s.footer") > editor.indexOf("</ScrollView>"));
});

test("email editor starts with current ownership, then a blank address and new-email verification", () => {
  const editor = readFileSync(
    "src/features/personal-details/PersonalDetailsEmailEditor.tsx",
    "utf8",
  );
  assert.match(editor, /useState<1 \| 2 \| 3>\(1\)/);
  assert.match(editor, /\[newEmail, setNewEmail\] = useState\(""\)/);
  assert.match(editor, /travelApi.requestCurrentEmailCode\(\)/);
  assert.match(editor, /travelApi.verifyCurrentEmailCode\(code\)/);
  assert.match(editor, /setOwnershipProof\(result.ownershipProof\)/);
  assert.match(editor, /maxLength=\{6\}/);
  assert.match(editor, /s.verificationField/);
  assert.match(editor, /s.verificationInput/);
  const fieldStart = editor.indexOf("s.verificationField");
  const fieldEnd = editor.indexOf("</View>", fieldStart);
  assert.ok(editor.indexOf("s.resendHit", fieldStart) < fieldEnd);
  assert.doesNotMatch(editor, /c.emailStep|s.boxes|caretHidden/);
  assert.match(editor, /label=\{c.emailContinue\}/);
  assert.match(editor, /OWNERSHIP_REQUIRED/);
  assert.doesNotMatch(editor, /phoneNumber.*ownershipProof/);
});

test("a resend lock on reopening still allows the delivered current-email code", () => {
  const editor = readFileSync("src/features/personal-details/PersonalDetailsEmailEditor.tsx", "utf8");
  const lock = editor.slice(editor.indexOf('if (apiError.details?.code === "MAX_RESENDS")'), editor.indexOf('// A code from a prior opening'));
  assert.match(lock, /setCodeSent\(true\)/);
  const restart = editor.slice(editor.indexOf('if (apiError?.details?.code === "OWNERSHIP_REQUIRED")'), editor.indexOf('if (apiError?.status === 429)'));
  assert.match(restart, /setLockedUntil\(0\)/);
  assert.match(restart, /setSentUntil\(0\)/);
});

test("resending keeps the code input focused and ships no visual-review bypass", () => {
 const editor = readFileSync("src/features/personal-details/PersonalDetailsEmailEditor.tsx", "utf8");
 assert.match(editor, /editable=\{!busy \|\| requesting\}/);
 assert.doesNotMatch(editor, /previewSend|LOCAL TEST|visual-review-only|submissionDisabled|__DEV__/);
});
