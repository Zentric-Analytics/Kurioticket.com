import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/components/PageContentState.tsx", "utf8");
const accountScreens = readFileSync("src/features/account/NativeAccountScreens.tsx", "utf8");

test("shared page content state has consistent contextual loading, initial error, retry, and accessibility", () => {
  assert.match(component, /`Loading \$\{props\.pageName\}…`/);
  assert.match(component, /Couldn't load \{props\.pageName\}/);
  assert.match(component, /Check your connection and try again\./);
  assert.match(component, /accessibilityRole="progressbar"/);
  assert.match(component, /accessibilityLiveRegion="polite"/);
  assert.match(component, /accessibilityLabel="Try again"/);
  assert.doesNotMatch(component, /Trying again|Retrying/);
});

test("email and travel headers remain outside mutually exclusive initial content states", () => {
  assert.match(accountScreens, /<Shell title=\{t\("emailPreferences"\)\}>\{state\.loading&&!hasLoaded\?<PageContentState state="loading" pageName="email preferences"/);
  assert.match(accountScreens, /!hasLoaded&&state\.error\?<PageContentState state="error" pageName="email preferences"/);
  assert.match(accountScreens, /<Shell title=\{t\("travelPreferences"\)\}>\{state\.loading && !hasLoaded \? <PageContentState state="loading" pageName="travel preferences"/);
  assert.match(accountScreens, /!hasLoaded && state\.error \? <PageContentState state="error" pageName="travel preferences"/);
  assert.doesNotMatch(accountScreens, /ActivityIndicator/);
});
