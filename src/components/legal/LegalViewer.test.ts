import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";
import { legalDocuments } from "@/data/legalDocuments";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { LocaleProvider } = jiti("@/components/layout/LocaleProvider") as typeof import("@/components/layout/LocaleProvider");
const { LegalViewer } = jiti("./LegalViewer") as typeof import("./LegalViewer");

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

for (const slug of ["terms-of-service", "privacy-policy"]) {
  test(`${slug}: clean rendering reuses the web document styling and content without website controls`, () => {
    const document = legalDocuments.find((entry) => entry.slug === slug)!;
    const render = (appBrowser: boolean) => renderToStaticMarkup(
      createElement(LocaleProvider, null, createElement(LegalViewer, { document, appBrowser })),
    );
    const normal = render(false);
    const clean = render(true);

    assert.match(normal, /href="\/legal"/);
    assert.match(normal, /<button/);
    assert.match(normal, /<aside>/);
    assert.doesNotMatch(clean, /<aside|<nav|<button|href="\/legal"|Legal Center|Print|TABLE OF CONTENTS/);

    // Compare rendered document elements, including classes, text, date and
    // paragraph spacing. Only anchor scroll offset accounts for the site header.
    for (const pattern of [/<h1\b[^>]*>[\s\S]*?<\/h1>/g, /<p\b[^>]*>[\s\S]*?<\/p>/g]) {
      assert.deepEqual(clean.match(pattern), normal.match(pattern));
    }
    const article = (html: string) => html.match(/<article\b[\s\S]*?<\/article>/)![0]
      .replace(/scroll-mt-(6|24)/g, "scroll-offset");
    assert.equal(article(clean), article(normal));
    assert.match(clean, /class="mt-3 text-3xl font-bold text-navy"/);
    assert.match(clean, /class="text-xl font-bold text-navy"/);
    for (const html of [normal, clean]) {
      assert.match(html, /class="legal-paper rounded-lg border p-4 shadow-sm md:p-8/);
      assert.match(html, /class="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between"/);
    }
  });
}
