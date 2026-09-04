import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync("src/components/PageContentState.tsx", "utf8");
const accountScreens = readFileSync("src/features/account/NativeAccountScreens.tsx", "utf8");

test("shared page content state keeps one consistent layout while localizing copy", () => {
  assert.match(component, /useMobileLocalization/);
  assert.match(component, /PAGE_NAME_KEYS/);
  assert.match(component, /PAGE_STATE_COPY/);
  assert.match(component, /copy\.loading\(pageName\)/);
  assert.match(component, /copy\.loadError\(pageName\)/);
  assert.match(component, /const retryLabel = t\("retry"\)/);
  assert.match(component, /accessibilityRole="progressbar"/);
  assert.match(component, /accessibilityLiveRegion="polite"/);
  assert.match(component, /accessibilityLabel=\{retryLabel\}/);
  assert.doesNotMatch(component, /Trying again|Retrying/);
});

test("shared page states resolve canonical page names through mobile localization", () => {
  assert.match(component, /"personal details": "personalDetails"/);
  assert.match(component, /"security settings": "securitySettings"/);
  assert.match(component, /"email preferences": "emailPreferences"/);
  assert.match(component, /"travel preferences": "travelPreferences"/);
  assert.match(component, /notifications: "notifications"/);
  assert.match(component, /"price alerts": "priceAlerts"/);
  assert.match(component, /"recent searches": "recentSearches"/);
  assert.match(component, /"saved items": "savedItems"/);
});

test("email and travel headers remain outside mutually exclusive initial content states", () => {
  assert.match(accountScreens, /<Shell title=\{t\("emailPreferences"\)\}>\{state\.loading&&!hasLoaded\?<PageContentState state="loading" pageName="email preferences"/);
  assert.match(accountScreens, /!hasLoaded&&state\.error\?<PageContentState state="error" pageName="email preferences"/);
  assert.match(accountScreens, /<Shell title=\{t\("travelPreferences"\)\}>\{state\.loading && !hasLoaded \? <PageContentState state="loading" pageName="travel preferences"/);
  assert.match(accountScreens, /!hasLoaded && state\.error \? <PageContentState state="error" pageName="travel preferences"/);
  assert.doesNotMatch(accountScreens, /ActivityIndicator/);
});
