import assert from "node:assert/strict";
import test from "node:test";
import { formatRecoveryCodesForClipboard, normalizeAuthenticatorCode } from "./twoFactorInput";

test("authenticator input accepts typed digits and normalizes pasted codes", () => {
  assert.equal(normalizeAuthenticatorCode("123456"), "123456");
  assert.equal(normalizeAuthenticatorCode("123 456"), "123456");
  assert.equal(normalizeAuthenticatorCode("123-456"), "123456");
  assert.equal(normalizeAuthenticatorCode("12a34b56789"), "123456");
});

test("recovery codes are copied in useful plain text without transforming them", () => {
  const codes = ["CODE-ONE", "Code-Two", "three-3"];
  assert.equal(formatRecoveryCodesForClipboard(codes), "CODE-ONE\nCode-Two\nthree-3");
  assert.deepEqual(codes, ["CODE-ONE", "Code-Two", "three-3"]);
});
