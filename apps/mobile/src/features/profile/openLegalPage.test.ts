import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const helper = source("src/features/profile/openLegalPage.ts");
const card = source("src/features/profile/ProfileCardSection.tsx");
const urls = source("src/config/legalUrls.ts");

test("Profile Terms and Privacy use the native in-app browser with canonical URLs", () => {
  assert.match(urls, /TERMS_URL = "https:\/\/kurioticket\.com\/terms"/);
  assert.match(urls, /PRIVACY_URL = "https:\/\/kurioticket\.com\/privacy"/);
  assert.match(helper, /terms: TERMS_URL/);
  assert.match(helper, /privacy: PRIVACY_URL/);
  assert.match(helper, /WebBrowser\.openBrowserAsync\(LEGAL_URLS\[page\]\)/);
  assert.match(card, /openLegalPage\(destination\.page\)/);
});

test("legal pages do not use external Linking or app navigation", () => {
  assert.doesNotMatch(helper, /Linking|openURL|router/);
  assert.doesNotMatch(card, /Linking|openExternal/);
  assert.match(card, /destination\.kind === "legal"[\s\S]*openLegalPage/);
  assert.match(card, /: router\.push\(destination\.href\)/);
});

test("legal browser failures show safe feedback and duplicate taps are ignored", () => {
  assert.match(helper, /if \(browserOpen\) return/);
  assert.match(helper, /catch \{[\s\S]*Alert\.alert\("Couldn't open this page", "Please try again\."\)/);
  assert.match(helper, /finally \{[\s\S]*browserOpen = false/);
});

test("unrelated mobile web handoffs retain their existing implementation", () => {
  assert.match(source("src/features/profile/safeExternalLink.ts"), /Linking\.openURL/);
  assert.match(source("src/features/flow/TabScreens.tsx"), /Linking\.openURL\(trip\.providerAction!\.url\)/);
});
