import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("light and dark themes provide contrasting production surfaces", () => {
  const provider = readFileSync("src/theme/AppTheme.tsx", "utf8");
  assert.match(provider, /lightTheme[\s\S]*dark: false/);
  assert.match(provider, /darkTheme[\s\S]*dark: true/);
  assert.match(provider, /background: "#091224"/);
  assert.match(provider, /surface: "#121E33"/);
  assert.match(provider, /text: "#F4F7FF"/);
});

test("profile switch is enabled, controlled, and persisted through theme context", () => {
  const profile = readFileSync("src/features/profile/ProfileScreen.tsx", "utf8");
  const provider = readFileSync("src/theme/AppTheme.tsx", "utf8");
  assert.match(profile, /value=\{darkMode\}/);
  assert.match(profile, /onValueChange=\{toggleDarkMode\}/);
  assert.doesNotMatch(profile, /Dark mode, unavailable/);
  assert.match(provider, /readDarkMode\(\)/);
  assert.match(provider, /writeDarkMode\(enabled\)/);
});
