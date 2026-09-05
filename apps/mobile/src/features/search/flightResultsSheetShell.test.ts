import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const shell=readFileSync("src/features/search/FlightResultsSheetShell.tsx","utf8");
test("quick Flight filters use the Hotel-style bottom-sheet contract",()=>{assert.match(shell,/transparent=\{!fullScreen\}/);assert.match(shell,/animationType="slide"/);assert.match(shell,/"overFullScreen"/);assert.match(shell,/BlurView/);assert.match(shell,/rgba\(15, 23, 42, 0\.35\)/);assert.match(shell,/KeyboardAvoidingView/);assert.match(shell,/onRequestClose=\{onClose\}/);assert.match(shell,/onAccessibilityEscape=\{onClose\}/);assert.match(shell,/borderTopLeftRadius: 24/);assert.doesNotMatch(shell,/animationType="fade"|compactMenu|measureInWindow/);});
test("main Flight Filter remains full screen",()=>{assert.match(shell,/presentationStyle=\{fullScreen \? "fullScreen"/);assert.match(shell,/styles\.fullScreen/);});
test("anchor positioning module is deleted",()=>assert.equal(existsSync("src/features/search/flightResultsQuickMenuAnchor.ts"),false));
test("full and quick sheet bodies have distinct sizing contracts",()=>{
  assert.match(shell,/fullScreen \? styles\.fullScreenContent : styles\.quickContent/);
  assert.match(shell,/fullScreenContent: \{ flex: 1, minHeight: 0 \}/);
  assert.match(shell,/quickContent: \{ flexShrink: 1, minHeight: 0 \}/);
  assert.match(shell,/Math\.min\(height \* \.76, 620\)/);
  assert.doesNotMatch(shell,/maxHeight: fullScreen \? "100%"/);
  assert.match(shell,/fullScreen: \{ flex: 1, minHeight: 0/);
  assert.doesNotMatch(shell,/quickContent: \{[^}]*flex: 1/);
});
test("footer remains a normal sibling below the body and reserves safe area plus breathing room",()=>{
  assert.ok(shell.indexOf("styles.quickContent") < shell.indexOf("styles.footer"));
  const footerStyle=/footer: \{([^}]*)\}/.exec(shell)?.[1] ?? "";
  assert.doesNotMatch(footerStyle,/position:\s*["']absolute["']/);
  assert.match(footerStyle,/flexShrink: 0/);
  assert.match(shell,/const footerBottomPadding = fullScreen \? inset\.bottom \+ 16 : Math\.max\(inset\.bottom, 12\)/);
  assert.match(shell,/paddingBottom: footerBottomPadding/);
  assert.doesNotMatch(shell,/Math\.max\(inset\.bottom, fullScreen \? 16 : 12\)/);
});
