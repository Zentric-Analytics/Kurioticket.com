import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const initService = readFileSync("src/services/faqCmsService.ts", "utf8");
const initRoute = readFileSync("src/app/api/admin/content/faqs/initialize/route.ts", "utf8");
const listPage = readFileSync("src/app/admin/content/faqs/page.tsx", "utf8");
const editor = readFileSync("src/components/admin/FaqCmsEditor.tsx", "utf8");
const detailPage = readFileSync("src/app/admin/content/faqs/[id]/page.tsx", "utf8");
const publicService = readFileSync("src/services/publicCmsContentService.ts", "utf8");
const publicRoute = readFileSync("src/app/api/content/faqs/route.ts", "utf8");
const faqPage = readFileSync("src/app/faq/page.tsx", "utf8");
const faqContent = readFileSync("src/app/faq/FaqContent.tsx", "utf8");
const mobileFaq = readFileSync("apps/mobile/src/features/account/MobileFaqScreen.tsx", "utf8");

test("FAQ CMS initialization is explicit, transactional, published and audited", () => {
  assert.match(initRoute, /requireAdminApiSession\(\)/);
  assert.match(initRoute, /hasRecentReauthentication/);
  assert.match(initService, /\$transaction/);
  assert.match(initService, /CmsContentScope/);
  assert.match(initService, /status: "PUBLISHED"/);
  assert.match(initService, /CMS_FAQ_INITIALIZED/);
  assert.match(initService, /cmsContentRevision\.create/);
  assert.match(initService, /existingCount > 0/);
});

test("FAQ admin surface exposes the intended CMS lifecycle", () => {
  assert.match(listPage, /Initialize English FAQ CMS/);
  assert.match(listPage, /Add FAQ/);
  assert.match(listPage, /FaqCmsListClient/);
  for (const action of ["Create draft", "Save draft", "Publish", "Hide", "Archive"]) {
    assert.match(editor, new RegExp(action));
  }
  assert.match(editor, /Draft preview/);
  assert.match(editor, /Unpublished changes/);
  assert.match(detailPage, /Revision history/);
  assert.match(detailPage, /actorEmail/);
});

test("public FAQ reads are locale aware and preserve code fallback", () => {
  assert.match(publicService, /getPublishedFaqs\(localeInput/);
  assert.match(publicService, /normalizeLanguage/);
  assert.match(publicService, /getGeneralFaqs/);
  assert.match(publicService, /readPublishedCmsContent<CmsFaq>\("FAQ"/);
  assert.match(publicRoute, /getPublishedFaqs\(locale\)/);
  assert.match(publicRoute, /Cache-Control": "no-store"/);
});

test("FAQ page server-renders CMS content and refreshes on client locale changes", () => {
  assert.match(faqPage, /getPublishedFaqs\(initialLocale\)/);
  assert.match(faqPage, /initialFaqItems=/);
  assert.match(faqContent, /initialFaqLocale/);
  assert.match(faqContent, /\/api\/content\/faqs\?locale=/);
  assert.match(faqContent, /\[locale\]/);
});

test("Phase 2 does not change the native mobile FAQ source", () => {
  assert.match(mobileFaq, /getGeneralFaqs/);
  assert.doesNotMatch(mobileFaq, /api\/content\/faqs/);
});
