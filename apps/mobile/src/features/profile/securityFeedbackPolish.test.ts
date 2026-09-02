import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const passwordChangeFlow = readFileSync("src/features/profile/PasswordChangeFlow.tsx", "utf8");

test("security success feedback is concise without weakening accessibility copy", () => {
  assert.match(security, /function shortFeedbackMessage/);
  assert.match(security, /setLandingMessage\(shortFeedbackMessage\(c\.passwordSuccess\)\)/);
  assert.match(passwordChangeFlow, /AccessibilityInfo\.announceForAccessibility\(copy\.passwordSuccess\)/);
  assert.match(security, /setLandingMessage\(shortFeedbackMessage\(resetCopy\.success\)\)/);
});

test("security success toast is anchored below the header instead of above destructive actions", () => {
  assert.match(security, /top: insets\.top \+ 64/);
  assert.doesNotMatch(security, /bottom: insets\.bottom \+ 16/);
  assert.match(security, /translateY = useRef\(new Animated\.Value\(-8\)\)/);
  assert.match(security, /toastPosition: \{ position: "absolute", left: 16, right: 16/);
});
