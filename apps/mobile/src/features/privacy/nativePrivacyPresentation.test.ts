import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sheet = readFileSync("src/features/privacy/AnalyticsConsentControl.tsx", "utf8");
const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");

test("both native platforms share a focused-home first-visit privacy prompt", () => {
  assert.match(home, /<NativeFirstVisitPrivacyPrompt \/>/);
  assert.match(sheet, /focused && state\.loaded && state\.choice === "unknown"/);
  assert.match(sheet, /useFocusEffect/);
  assert.match(sheet, /visible=\{focused\} initial/);
  assert.match(sheet, /animationType="fade"/);
  assert.match(sheet, /useSafeAreaInsets/);
  assert.match(sheet, /onRequestClose=\{close\}/);
  assert.doesNotMatch(sheet, /Platform\.OS|Platform\.select/);
});

test("native preferences have an explicit save and draft toggle without extra cookie categories", () => {
  assert.match(sheet, /analytics checked=\{draft\}/);
  assert.match(sheet, /onChange=\{setDraft\}/);
  assert.match(sheet, /label="Save preferences".*choose\(draft\)/);
  assert.match(sheet, /label="Essential only".*choose\(false\)/);
  assert.match(sheet, /await visitorIdentity\.choose\(value\)/);
  assert.match(sheet, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(sheet, /Privacy preferences/);
  assert.doesNotMatch(sheet, /Cookie Policy|Privacy Policy|Marketing cookies|Reject optional|Privacy categories/);
  assert.match(sheet, /Manage your preferences/);
  assert.match(sheet, /title="Performance sharing"/);
  assert.match(sheet, /not enabled by Accept all/);
});
