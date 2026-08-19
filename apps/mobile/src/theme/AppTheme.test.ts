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

test("settings switch is enabled, controlled, and persisted through theme context", () => {
  const settings = readFileSync("src/features/flow/SettingsScreens.tsx", "utf8");
  const provider = readFileSync("src/theme/AppTheme.tsx", "utf8");
  assert.match(settings, /value=\{darkMode\}/);
  assert.match(settings, /onValueChange=\{/);
  assert.doesNotMatch(settings, /Dark mode, unavailable/);
  assert.match(provider, /readDarkMode\(\)/);
  assert.match(provider, /writeDarkMode\(enabled\)/);
});
