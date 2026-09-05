import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const shell=readFileSync("src/features/search/FlightResultsSheetShell.tsx","utf8");
test("quick Flight filters use the Hotel-style bottom-sheet contract",()=>{assert.match(shell,/transparent=\{!fullScreen\}/);assert.match(shell,/animationType="slide"/);assert.match(shell,/"overFullScreen"/);assert.match(shell,/BlurView/);assert.match(shell,/rgba\(15, 23, 42, 0\.35\)/);assert.match(shell,/KeyboardAvoidingView/);assert.match(shell,/onRequestClose=\{onClose\}/);assert.match(shell,/onAccessibilityEscape=\{onClose\}/);assert.match(shell,/borderTopLeftRadius: 24/);assert.doesNotMatch(shell,/animationType="fade"|compactMenu|measureInWindow/);});
test("main Flight Filter remains full screen",()=>{assert.match(shell,/presentationStyle=\{fullScreen \? "fullScreen"/);assert.match(shell,/styles\.fullScreen/);});
test("anchor positioning module is deleted",()=>assert.equal(existsSync("src/features/search/flightResultsQuickMenuAnchor.ts"),false));
