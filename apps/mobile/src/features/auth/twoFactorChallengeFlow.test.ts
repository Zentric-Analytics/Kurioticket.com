import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flow = readFileSync("src/features/auth/AuthFlow.tsx", "utf8");

test("two-factor back navigation follows its password or Google origin", () => {
  assert.match(flow, /setTwoFactorOrigin\("google"\)/);
  assert.match(flow, /setTwoFactorOrigin\("password"\)/);
  assert.match(flow, /setStep\(twoFactorOrigin === "google" \? "welcome" : "password"\)/);
});

test("expired and exhausted challenges clear their token and restore usable sign-in", () => {
  assert.match(flow, /error\.status === 410 \|\| error\.status === 429/);
  const terminal = flow.slice(flow.indexOf("if (isTerminalTwoFactorError"), flow.indexOf("throw twoFactorError"));
  assert.match(terminal, /setChallengeToken\(""\)/);
  assert.match(terminal, /setStep\(twoFactorOrigin === "google" \? "welcome" : "password"\)/);
  assert.match(terminal, /Two-factor check expired/);
});
