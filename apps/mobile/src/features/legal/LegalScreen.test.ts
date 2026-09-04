import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildLegalHtml, escapeLegalText } from "./legalHtml";

const source = (path: string) => readFileSync(path, "utf8");
const screen = source("src/features/legal/LegalScreen.tsx");
const profile = source("src/features/profile/ProfileCardSection.tsx");
const model = source("src/features/profile/profileModel.ts");

test("profile legal rows navigate to native routes without browser behavior", () => {
  assert.match(model, /href: "\/terms-of-service"/);
  assert.match(model, /href: "\/privacy-policy"/);
  assert.match(profile, /router\.push\(destination\.href\)/);
  assert.doesNotMatch(profile, /openBrowserAsync|openLegalPage/);
});

test("legal screen keeps its native header outside a local WebView", () => {
  assert.ok(screen.indexOf("styles.header") < screen.indexOf("<WebView"));
  assert.match(screen, /router\.dismissTo\("\/\(tabs\)\/profile"\)/);
  assert.match(screen, /source=\{\{ html: buildLegalHtml/);
  assert.match(screen, /javaScriptEnabled=\{false\}/);
  assert.match(screen, /sharedCookiesEnabled=\{false\}/);
  assert.match(screen, /onShouldStartLoadWithRequest=\{\(\{ url \}\) => url === "about:blank"\}/);
  assert.match(screen, /startInLoadingState/);
  assert.match(screen, /renderLoading=\{\(\) => <PageContentState state="loading"/);
  assert.doesNotMatch(screen, /@ts-ignore/);
});

test("loading, errors, and retry stay in app without automatic browser fallback", () => {
  assert.match(screen, /status === "loading" \? <PageContentState state="loading"/);
  assert.match(screen, /status === "error" \? <PageContentState state="error"/);
  assert.match(screen, /onRetry=\{load\}/);
  assert.equal((screen.match(/Linking\.openURL/g) ?? []).length, 1);
  assert.match(screen, /onPress=\{\(\) => void Linking\.openURL\(publicUrl\)\}/);
});

test("controlled HTML escapes document fields and preserves accessible scaling", () => {
  assert.equal(escapeLegalText(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  const html = buildLegalHtml({ slug: "terms-of-service", title: "ignored", summary: "<summary>", lastUpdated: "<date>", lastUpdatedLabel: "<updated>", sections: [{ id: "ignored", title: "<heading>", paragraphs: ["<paragraph>"] }] }, { dark: false, lang: "en-US", direction: "ltr" });
  for (const value of ["summary", "date", "updated", "heading", "paragraph"]) assert.ok(html.includes(`&lt;${value}&gt;`));
  assert.doesNotMatch(html, /<summary>|<paragraph>/);
  assert.match(html, /<html lang="en-US" dir="ltr">/);
  assert.doesNotMatch(html, /maximum-scale/);
});

test("Arabic legal HTML is explicitly RTL", () => {
  const html = buildLegalHtml({ slug: "privacy-policy", title: "ignored", summary: "ملخص", lastUpdated: "2026-09-04", lastUpdatedLabel: "آخر تحديث", sections: [{ id: "section", title: "العنوان", paragraphs: ["النص"] }] }, { dark: true, lang: "ar", direction: "rtl" });
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /direction:rtl/);
  assert.match(html, /text-align:right/);
});
