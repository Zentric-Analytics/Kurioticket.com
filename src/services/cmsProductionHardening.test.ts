import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261023070000_harden_cms_operations/migration.sql", "utf8");
const contentService = readFileSync("src/services/cmsContentService.ts", "utf8");
const hardeningService = readFileSync("src/services/cmsHardeningService.ts", "utf8");
const itemRoute = readFileSync("src/app/api/admin/content/[id]/route.ts", "utf8");
const scopeRoute = readFileSync("src/app/api/admin/content/scope/route.ts", "utf8");
const healthPage = readFileSync("src/app/admin/content/health/page.tsx", "utf8");
const faqDetail = readFileSync("src/app/admin/content/faqs/[id]/page.tsx", "utf8");
const homepageDetail = readFileSync("src/app/admin/content/homepage/[section]/[id]/page.tsx", "utf8");
const faqEditor = readFileSync("src/components/admin/FaqCmsEditor.tsx", "utf8");
const homepageEditor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");

test("CMS hardening schema adds restore/order actions and versioned fallback policy", () => {
  assert.match(schema, /RESTORED/);
  assert.match(schema, /ORDER_NORMALIZED/);
  assert.match(schema, /legacyFallbackRetiredAt/);
  assert.match(schema, /legacyFallbackRetiredByAdminUserId/);
  assert.match(schema, /version\s+Int\s+@default\(1\)/);
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'RESTORED'/);
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'ORDER_NORMALIZED'/);
  assert.match(migration, /legacyFallbackRetiredAt/);
});

test("revision restore creates a new validated draft and never republishes automatically", () => {
  assert.match(contentService, /restoreCmsContentRevision/);
  assert.match(contentService, /revisionId/);
  assert.match(contentService, /parsePayload\(existing\.type, revision\.draftPayload\)/);
  assert.match(contentService, /action: "RESTORED"/);
  assert.match(contentService, /auditAction: "CMS_CONTENT_RESTORED"/);
  const restoreSection = contentService.slice(contentService.indexOf("export async function restoreCmsContentRevision"), contentService.indexOf("export async function publishCmsContent"));
  assert.doesNotMatch(restoreSection, /publishedPayload:\s*restoredPayload/);
  assert.match(itemRoute, /action === "restore_revision"/);
  assert.match(faqDetail, /CmsRevisionRestoreButton/);
  assert.match(homepageDetail, /CmsRevisionRestoreButton/);
});

test("scope hardening uses optimistic concurrency and preserves explicit publishing", () => {
  assert.match(hardeningService, /expectedScopeVersion/);
  assert.match(hardeningService, /normalizeCmsDraftOrder/);
  assert.match(hardeningService, /setCmsLegacyFallbackRetired/);
  assert.match(hardeningService, /CMS_ORDER_NORMALIZED/);
  assert.match(hardeningService, /CMS_LEGACY_FALLBACK_RETIRED/);
  assert.match(hardeningService, /CMS_LEGACY_FALLBACK_REACTIVATED/);
  assert.match(hardeningService, /action: "ORDER_NORMALIZED"/);
  assert.doesNotMatch(
    hardeningService.slice(hardeningService.indexOf("export async function normalizeCmsDraftOrder"), hardeningService.indexOf("export async function setCmsLegacyFallbackRetired")),
    /publishedSortOrder:\s*nextOrder/,
  );
});

test("fallback retirement is guarded by production reauthentication and integrity", () => {
  assert.match(scopeRoute, /hasRecentReauthentication/);
  assert.match(scopeRoute, /retire_legacy_fallback/);
  assert.match(scopeRoute, /reactivate_legacy_fallback/);
  assert.match(hardeningService, /Legacy fallback cannot be retired while published CMS content is invalid/);
  assert.match(hardeningService, /Legacy fallback cannot be retired while published order collisions exist/);
  assert.match(contentService, /scope\?\.legacyFallbackRetiredAt/);
  assert.match(contentService, /\{ source: "cms", items: \[\] \}/);
});

test("CMS health reports integrity, ordering, fallback and unpublished changes", () => {
  assert.match(hardeningService, /getCmsScopeIntegrity/);
  assert.match(hardeningService, /getCmsHealthOverview/);
  assert.match(hardeningService, /invalidDrafts/);
  assert.match(hardeningService, /invalidPublished/);
  assert.match(hardeningService, /orphanPublished/);
  assert.match(hardeningService, /draftOrderCollisions/);
  assert.match(hardeningService, /publishedOrderCollisions/);
  assert.match(hardeningService, /draftOrderNeedsNormalization/);
  assert.match(healthPage, /CMS Health/);
  assert.match(healthPage, /View audit logs/);
  assert.match(contentPage, /href="\/admin\/content\/health"/);
});

test("edit conflicts provide an explicit recovery path", () => {
  for (const editor of [faqEditor, homepageEditor]) {
    assert.match(editor, /response\.status === 409/);
    assert.match(editor, /Reload latest/);
    assert.match(editor, /window\.location\.reload\(\)/);
  }
});
