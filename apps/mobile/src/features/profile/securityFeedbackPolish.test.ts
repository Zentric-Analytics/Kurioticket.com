import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const security = readFileSync("src/features/profile/SecurityScreen.tsx", "utf8");
const passwordChangeFlow = readFileSync("src/features/profile/PasswordChangeFlow.tsx", "utf8");
const passwordResetFlow = readFileSync("src/features/profile/PasswordResetFlow.tsx", "utf8");

test("security success feedback stays scoped without weakening accessibility copy", () => {
  assert.match(security, /function shortFeedbackMessage/);
  assert.match(security, /setLandingMessage\(shortFeedbackMessage\(c\.passwordSuccess\)\)/);
  assert.match(passwordChangeFlow, /AccessibilityInfo\.announceForAccessibility\(copy\.passwordSuccess\)/);

  assert.doesNotMatch(security, /setLandingMessage\(shortFeedbackMessage\(resetCopy\.success\)\)/);
  assert.match(passwordResetFlow, /setSucceeded\(true\)/);
  assert.match(passwordResetFlow, /AccessibilityInfo\.announceForAccessibility\(navigationCopy\.buttonSuccess\)/);
  assert.match(passwordResetFlow, /setTimeout\(resolve, 1200\)/);
  assert.match(passwordResetFlow, /label=\{succeeded \? `✓ \$\{navigationCopy\.buttonSuccess\}` : navigationCopy\.submit\}/);
  assert.match(passwordResetFlow, /accessibilityLiveRegion=\{succeeded \? "polite" : undefined\}/);
});

test("security success toast is anchored below the header instead of above destructive actions", () => {
  assert.match(security, /top: insets\.top \+ 64/);
  assert.doesNotMatch(security, /bottom: insets\.bottom \+ 16/);
  assert.match(security, /translateY = useRef\(new Animated\.Value\(-8\)\)/);
  assert.match(security, /toastPosition: \{ position: "absolute", left: 16, right: 16/);
});
