import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sheet = readFileSync("src/features/privacy/AnalyticsConsentControl.tsx", "utf8");
const root = readFileSync("app/_layout.tsx", "utf8");
const settings = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");
const profile = readFileSync("src/features/profile/ProfileCardSection.tsx", "utf8");
const home = readFileSync("src/features/flow/HomeFlowScreen.tsx", "utf8");

test("one shared native prompt covers new and existing users on eligible customer screens", () => {
  assert.match(root, /<NativeFirstVisitPrivacyPrompt \/>/);
  assert.doesNotMatch(home, /<NativeFirstVisitPrivacyPrompt/);
  assert.match(sheet, /focused && state\.loaded && state\.reviewRequired/);
  assert.match(sheet, /setInitialDraft\(state\.choice !== "declined"\)/);
  assert.match(sheet, /usePathname/);
  assert.match(sheet, /visible=\{focused\} initial/);
  assert.match(sheet, /animationType="fade"/);
  assert.match(sheet, /useSafeAreaInsets/);
  assert.match(sheet, /onRequestClose=\{close\}/);
});

test("native consent requires an explicit choice and leaves unsupported categories unavailable", () => {
  assert.match(sheet, /analytics checked=\{draft\}/);
  assert.match(sheet, /onChange=\{setDraft\}/);
  assert.match(sheet, /"Allow analytics" : "Save preferences".*choose\(draft\)/);
  assert.doesNotMatch(sheet, /label="Essential only"/);
  assert.match(sheet, /label="Privacy preferences" secondary disabled=\{saving\} onPress=\{onOpen\}/);
  assert.equal((sheet.match(/label="Accept all"/g) ?? []).length, 2);
  assert.match(sheet, /turn off analytics and save your preferences/);
  assert.match(sheet, /await visitorIdentity\.choose\(value\)/);
  assert.match(sheet, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(sheet, /Manage your preferences/);
  for (const category of ["Performance sharing", "Marketing sharing"]) {
    const line = sheet.split("\n").find(value => value.includes('title="' + category + '"'));
    assert.ok(line?.includes("unavailable"));
    assert.ok(line?.includes("not enabled by Accept all"));
  }
  assert.doesNotMatch(settings, /AnalyticsConsentControl|Privacy preferences/);
  assert.match(profile, /section\.title === "aboutLegal" \? <AnalyticsConsentControl \/>/);
  assert.match(sheet, /Manage analytics consent/);
});
