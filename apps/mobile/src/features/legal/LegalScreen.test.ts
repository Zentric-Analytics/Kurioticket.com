import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildLegalHtml, escapeLegalText } from "./legalHtml";

const source = (path: string) => readFileSync(path, "utf8");
const screen = source("src/features/legal/LegalScreen.tsx");
const profile = source("src/features/profile/ProfileCardSection.tsx");
const model = source("src/features/profile/profileModel.ts");

test("Profile legal destinations use the Preview system browser while retaining non-Preview native routes", () => {
  const tabs = source("app/(tabs)/_layout.tsx");
  const profileLayout = source("app/(tabs)/profile/_layout.tsx");
  assert.match(model, /path: "\/mobile\/legal\/terms-of-service"[\s\S]*?productionHref: "\/(?:\(tabs\))\/profile\/terms-of-service"/);
  assert.match(model, /path: "\/mobile\/legal\/privacy-policy"[\s\S]*?productionHref: "\/(?:\(tabs\))\/profile\/privacy-policy"/);
  assert.doesNotMatch(model, /fallbackHref/);
  assert.match(profile, /navigateProfileDestination\(destination, getRuntimeEnvironment\(\)/);
  assert.doesNotMatch(profile, /^import .*expo-web-browser/m);
  assert.match(profile, /await import\("expo-web-browser"\)/);
  assert.match(profile, /WebBrowser\.openBrowserAsync\(url\)/);
  assert.match(profile, /openBrowser: openPreviewBrowser/);
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

test("Preview legal WebView stays on the expected legal route and treats main-document HTTP failures as retryable errors", () => {
  assert.match(screen, /const previewAllowedNavigationUrls = useMemo/);
  assert.match(screen, /if \(slug === "terms-of-service"\) urls\.push\(`\$\{previewWebOrigin\}\/legal\/terms-of-service`\)/);
  assert.match(screen, /originWhitelist=\{\[previewWebOrigin\]\}/);
  assert.doesNotMatch(screen, /originWhitelist=\{\[`\$\{previewWebOrigin\}\/\*`\]\}/);
  assert.match(screen, /onShouldStartLoadWithRequest=\{\(\{ url \}\) => isAllowedPreviewNavigation\(url\)\}/);
  assert.match(screen, /onHttpError=\{\(\{ nativeEvent \}\) => \{/);
  assert.match(screen, /nativeEvent\.statusCode < 400/);
  assert.match(screen, /!isAllowedPreviewNavigation\(nativeEvent\.url\)/);
  assert.match(screen, /previewLoadFailed\.current = true/);
  assert.match(screen, /if \(previewLoadFailed\.current\) return/);
  assert.match(screen, /setLoadState\("error"\)/);
});

test("legal controls are icon-only, right aligned above the real Profile tab bar", () => {
  assert.match(screen, /testID="legal-action-dock"/);
  assert.match(screen, /testID="legal-action-toolbar"/);
  assert.match(screen, /toolbarDock: \{ minHeight: 66, alignItems: "flex-end"/);
  assert.match(screen, /toolbarPill: \{ width: 112, height: 52/);
  assert.match(screen, /<LegalShareIcon color=\{theme\.icon\} size=\{22\} \/>/);
  assert.match(screen, /<FlowIcon name="refresh" color=\{theme\.icon\} size=\{22\} \/>/);
  assert.doesNotMatch(screen, /<Text style=\{styles\.actionText\}>/);
  assert.doesNotMatch(screen, /Share or open<|Refresh</);
});

test("Share/Open uses a compact anchored menu and only opens external actions after a tap", () => {
  assert.match(screen, /testID="legal-action-menu"/);
  assert.match(screen, /setActionMenuOpen\(\(open\) => !open\)/);
  assert.match(screen, /Share\.share\(\{ title, message:/);
  assert.match(screen, /Linking\.openURL\(publicUrl\)/);
  assert.match(screen, /accessibilityLabel=\{copy\.share\}/);
  assert.match(screen, /accessibilityLabel=\{copy\.openBrowser\}/);
  assert.doesNotMatch(screen, /Alert\.alert/);
});

test("refresh always remounts the WebView so identical legal content really reloads", () => {
  assert.match(screen, /const \[webViewRevision, setWebViewRevision\] = useState\(0\)/);
  assert.match(screen, /setWebViewRevision\(\(revision\) => revision \+ 1\)/);
  assert.match(screen, /key=\{`\$\{slug\}-\$\{locale\}-\$\{webViewRevision\}`\}/);
  assert.match(screen, /setRefreshing\(true\)/);
  assert.match(screen, /disabled=\{refreshing\}/);
  assert.match(screen, /ActivityIndicator size="small" color=\{theme\.icon\}/);
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

test("controlled HTML mirrors website LegalViewer structure while staying responsive for mobile", () => {
  assert.equal(escapeLegalText(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  const html = buildLegalHtml({ slug: "terms-of-service", title: "<title>", summary: "<summary>", lastUpdated: "<date>", lastUpdatedLabel: "<updated>", legalCenterLabel: "<legal-center>", tableOfContentsLabel: "<contents>", sections: [{ id: "ignored", title: "<heading>", paragraphs: ["<paragraph>"] }] }, { dark: false, lang: "en-US", direction: "ltr", tableOfContentsFallback: "Fallback contents" });
  for (const value of ["title", "summary", "date", "updated", "legal-center", "contents", "heading", "paragraph"]) assert.ok(html.includes(`&lt;${value}&gt;`));
  assert.doesNotMatch(html, /<summary>|<paragraph>/);
  assert.match(html, /<html lang="en-US" dir="ltr">/);
  assert.match(html, /@font-face\{font-family:Inter/);
  assert.match(html, /kurioticket\.com\/brand\/fonts\/inter\/Inter-VariableFont\.ttf/);
  assert.match(html, /class="legal-paper"/);
  assert.match(html, /class="document-head"/);
  assert.match(html, /class="legal-center"/);
  assert.match(html, /class="document-title"/);
  assert.match(html, /class="document-grid"/);
  assert.match(html, /class="contents-nav"/);
  assert.match(html, /class="article"/);
  assert.match(html, /linear-gradient\(180deg,rgba\(15,159,154,.42\),rgba\(37,99,235,.18\)\)/);
  assert.match(html, /\.contents-nav a\{display:flex;align-items:center;min-height:44px/);
  assert.doesNotMatch(html, /<ol>|<li>/);
  assert.match(html, /<section id=/);
  assert.match(html, /<h2>/);
  assert.match(html, /overflow-x:auto/);
  assert.doesNotMatch(html, /maximum-scale|navbar|footer|print/);
});

test("controlled HTML falls back safely when an older API response omits optional presentation labels", () => {
  const html = buildLegalHtml({ slug: "privacy-policy", title: "ignored", summary: "summary", lastUpdated: "date", lastUpdatedLabel: "updated", sections: [{ id: "section", title: "Heading", paragraphs: ["Paragraph"] }] }, { dark: false, lang: "en-US", direction: "ltr", tableOfContentsFallback: "Fallback contents" });
  assert.match(html, /aria-label="Fallback contents"/);
  assert.match(html, />Fallback contents<\/h2>/);
  assert.match(html, />Legal Center<\/span>/);
});

test("Arabic legal HTML is explicitly RTL", () => {
  const html = buildLegalHtml({ slug: "privacy-policy", title: "ignored", summary: "ملخص", lastUpdated: "2026-09-04", lastUpdatedLabel: "آخر تحديث", legalCenterLabel: "المركز القانوني", tableOfContentsLabel: "المحتويات", sections: [{ id: "section", title: "العنوان", paragraphs: ["النص"] }] }, { dark: true, lang: "ar", direction: "rtl", tableOfContentsFallback: "المحتويات" });
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /direction:rtl/);
  assert.match(html, /text-align:right/);
});
