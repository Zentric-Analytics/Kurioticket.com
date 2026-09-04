import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildLegalHtml, escapeLegalText } from "./legalHtml";

const source = (path: string) => readFileSync(path, "utf8");
const screen = source("src/features/legal/LegalScreen.tsx");
const profile = source("src/features/profile/ProfileCardSection.tsx");
const model = source("src/features/profile/profileModel.ts");

test("legal routes live in the Profile stack so the real tab bar stays mounted", () => {
  const tabs = source("app/(tabs)/_layout.tsx");
  const profileLayout = source("app/(tabs)/profile/_layout.tsx");
  assert.match(model, /href: "\/(?:\(tabs\))\/profile\/terms-of-service"/);
  assert.match(model, /href: "\/(?:\(tabs\))\/profile\/privacy-policy"/);
  assert.match(profile, /router\.push\(destination\.href\)/);
  assert.match(tabs, /KurioticketTabBar/);
  assert.match(tabs, /<Tabs\.Screen name="profile"/);
  assert.doesNotMatch(tabs, /terms-of-service|privacy-policy/);
  assert.match(profileLayout, /<Stack screenOptions=\{\{ headerShown: false \}\}/);
  assert.ok(source("app/(tabs)/profile/terms-of-service.tsx"));
  assert.ok(source("app/(tabs)/profile/privacy-policy.tsx"));
});

test("legal screen keeps one native header outside a secure local WebView", () => {
  assert.ok(screen.indexOf('testID="legal-native-header"') < screen.indexOf("<WebView"));
  assert.match(screen, /router\.back\(\)/);
  assert.match(screen, /source=\{\{ html, baseUrl: "about:blank" \}\}/);
  assert.match(screen, /javaScriptEnabled=\{false\}/);
  assert.match(screen, /sharedCookiesEnabled=\{false\}/);
  assert.match(screen, /onShouldStartLoadWithRequest=\{\(\{ url \}\) => url\.startsWith\("about:blank"\)\}/);
  assert.doesNotMatch(screen, /dismissTo|expo-web-browser/);
});

test("loading covers API and first WebView render, while render failure safely retries", () => {
  assert.match(screen, /"api-loading" \| "webview-loading" \| "ready" \| "error"/);
  assert.match(screen, /setLoadState\("webview-loading"\)/);
  assert.match(screen, /onLoad=\{handleWebViewLoad\}/);
  assert.match(screen, /onError=\{handleWebViewError\}/);
  assert.match(screen, /StyleSheet\.absoluteFill/);
  assert.match(screen, /onRetry=\{loadInitial\}/);
});

test("Share/Open offers explicit native Share and browser actions only after user action", () => {
  assert.ok(screen.indexOf("<WebView") < screen.indexOf('testID="legal-action-toolbar"'));
  assert.match(screen, /Alert\.alert\(title, undefined,/);
  assert.match(screen, /Share\.share\(\{ title, message:/);
  assert.match(screen, /Linking\.openURL\(publicUrl\)/);
  assert.match(screen, /text: copy\.share/);
  assert.match(screen, /text: copy\.openBrowser/);
  assert.match(screen, /onPress=\{shareOrOpen\}/);
});

test("refresh preserves the previous rendered document on fetch or WebView-render failure", () => {
  assert.match(screen, /refreshPreviousDocument\.current = document/);
  assert.match(screen, /refreshRenderPending\.current = true/);
  assert.match(screen, /\.catch\(\(\) => \{\s*refreshPreviousDocument\.current = null;\s*setRefreshFailed\(true\);\s*setRefreshing\(false\);/s);
  assert.match(screen, /if \(refreshRenderPending\.current && refreshPreviousDocument\.current\)/);
  assert.match(screen, /setDocument\(previous\)/);
  assert.match(screen, /setRefreshFailed\(true\)/);
  assert.match(screen, /onPress=\{refresh\}/);
});

test("controlled HTML escapes fields, uses Kurioticket Inter, and preserves canonical hierarchy and accessible scaling", () => {
  assert.equal(escapeLegalText(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  const html = buildLegalHtml({ slug: "terms-of-service", title: "ignored", summary: "<summary>", lastUpdated: "<date>", lastUpdatedLabel: "<updated>", tableOfContentsLabel: "<contents>", sections: [{ id: "ignored", title: "<heading>", paragraphs: ["<paragraph>"] }] }, { dark: false, lang: "en-US", direction: "ltr", tableOfContentsFallback: "Fallback contents" });
  for (const value of ["summary", "date", "updated", "contents", "heading", "paragraph"]) assert.ok(html.includes(`&lt;${value}&gt;`));
  assert.doesNotMatch(html, /<summary>|<paragraph>/);
  assert.match(html, /<html lang="en-US" dir="ltr">/);
  assert.match(html, /@font-face\{font-family:Inter/);
  assert.match(html, /kurioticket\.com\/brand\/fonts\/inter\/Inter-VariableFont\.ttf/);
  assert.match(html, /font-family:Inter/);
  assert.match(html, /<nav class="contents"/);
  assert.match(html, /<section id=/);
  assert.match(html, /<h2>/);
  assert.match(html, /overflow-x:auto/);
  assert.match(html, /\.contents a\{display:flex;align-items:center;min-height:44px;padding:8px 0\}/);
  assert.doesNotMatch(html, /maximum-scale|navbar|footer|print/);
});

test("controlled HTML falls back safely when an older API response omits the TOC label", () => {
  const html = buildLegalHtml({ slug: "privacy-policy", title: "ignored", summary: "summary", lastUpdated: "date", lastUpdatedLabel: "updated", sections: [{ id: "section", title: "Heading", paragraphs: ["Paragraph"] }] }, { dark: false, lang: "en-US", direction: "ltr", tableOfContentsFallback: "Fallback contents" });
  assert.match(html, /aria-label="Fallback contents"/);
  assert.match(html, />Fallback contents<\/p>/);
});

test("Arabic legal HTML is explicitly RTL", () => {
  const html = buildLegalHtml({ slug: "privacy-policy", title: "ignored", summary: "ملخص", lastUpdated: "2026-09-04", lastUpdatedLabel: "آخر تحديث", tableOfContentsLabel: "المحتويات", sections: [{ id: "section", title: "العنوان", paragraphs: ["النص"] }] }, { dark: true, lang: "ar", direction: "rtl", tableOfContentsFallback: "المحتويات" });
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /direction:rtl/);
  assert.match(html, /text-align:right/);
});
