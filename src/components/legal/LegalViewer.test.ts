import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/legal/LegalViewer.tsx", "utf8");
const appRoute = readFileSync("src/app/mobile/legal/[slug]/page.tsx", "utf8");

test("production legal viewer does not render internal developer placeholder notices", () => {
  assert.doesNotMatch(source, /developerNote|legalDeveloperNote|startup placeholder/i);
  assert.match(source, /localizedDocument\.sections\.map/);
});

test("app-browser legal presentation keeps only the legal document content", () => {
  assert.match(source, /appBrowser\s*\?\s*"min-h-screen bg-white/);
  assert.match(source, /!appBrowser && \(/);
  assert.match(source, /<Link[\s\S]*?href="\/legal"/);
  assert.match(source, /onClick=\{\(\) => window\.print\(\)\}/);
  assert.match(source, /!appBrowser && \([\s\S]*?<aside>/);
  assert.match(source, /localizedDocument\.title/);
  assert.match(source, /localizedDocument\.summary/);
  assert.match(source, /localizedDocument\.sections\.map/);
});

test("clean app-browser route is Preview-safe and contains no site chrome", () => {
  assert.match(appRoute, /isStagingEnvironment\(\)/);
  assert.match(appRoute, /process\.env\.NODE_ENV === "development"/);
  assert.match(appRoute, /APP_LEGAL_SLUGS/);
  assert.match(appRoute, /HIDE_STAGING_BADGE_CSS/);
  assert.match(appRoute, /data-staging-build="current"/);
  assert.match(appRoute, /<LegalViewer document=\{document\} appBrowser \/>/);
  assert.doesNotMatch(appRoute, /AppHeader|Footer|PrivacyPageClient/);
  assert.match(appRoute, /robots: \{ index: false, follow: false \}/);
});
