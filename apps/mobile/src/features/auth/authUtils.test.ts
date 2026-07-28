import * as assert from "node:assert/strict";
import { test } from "node:test";
import { formatCountdown, isValidEmail, nextCodeAfterBackspace, normalizeEmail, sanitizeCode } from "./authUtils";

test("normalizes and validates email without accepting malformed addresses", () => {
  assert.equal(normalizeEmail("  YOU@Example.COM "), "you@example.com");
  assert.equal(isValidEmail("you@example.com"), true);
  assert.equal(isValidEmail("you@example"), false);
  assert.equal(isValidEmail("you @example.com"), false);
});

test("verification input accepts digits, paste, and predictable backspace", () => {
  assert.equal(sanitizeCode("48 29-13"), "482913");
  assert.equal(sanitizeCode("123456789"), "123456");
  assert.equal(nextCodeAfterBackspace("482913"), "48291");
});

test("countdown uses the approved minute-second format", () => {
  assert.equal(formatCountdown(28), "00:28");
  assert.equal(formatCountdown(60), "01:00");
});
