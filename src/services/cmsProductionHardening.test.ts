import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261023070000_harden_cms_operations/migration.sql", "utf8");
const contentService = readFileSync("src/services/cmsContentService.ts", "utf8");
const hardeningService = readFileSync("src/services/cmsHardeningService.ts", "utf8");
const itemRoute = readFileSync("src/app/api/admin/content/[id]/route.ts", "utf8");
const scopeRoute = readFileSync("src/app/api/admin/content/scope/route.ts", "utf8");
const healthPage = readFileSync("src/app/admin/system/cms-health/page.tsx", "utf8");
const legacyHealthPage = readFileSync("src/app/admin/content/health/page.tsx", "utf8");
const adminNavigation = readFileSync("src/lib/adminNavigation.ts", "utf8");
const faqDetail = readFileSync("src/app/admin/content/faqs/[id]/page.tsx", "utf8");
const homepageDetail = readFileSync("src/app/admin/content/homepage/[section]/[id]/page.tsx", "utf8");
const faqEditor = readFileSync("src/components/admin/FaqCmsEditor.tsx", "utf8");
const homepageEditor = readFileSync("src/components/admin/HomepageCmsEditor.tsx", "utf8");
const hardeningActions = readFileSync("src/components/admin/CmsScopeHardeningActions.tsx", "utf8");
const healthRow = readFileSync("src/components/admin/CmsScopeHealthRow.tsx", "utf8");
const inlineRepair = readFileSync("src/components/admin/CmsHealthInlineRepair.tsx", "utf8");
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
  assert.match(contentService, /reason: "storage_unavailable"/);
  assert.match(contentService, /reason: "scope_uninitialized"/);
  assert.match(contentService, /reason: "invalid_published_payload"/);
  assert.match(contentService, /reason: "read_error"/);
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
  assert.match(hardeningService, /findMissingHomepageCmsScopes\(scopes, homepageCmsMarkets, homepageCmsLocale\)/);
  assert.match(healthPage, /Missing homepage CMS scopes/);
  assert.match(healthPage, /overview\.missingHomepageScopes\.map/);
  assert.match(healthPage, /<AdminPageShell title="CMS Health" eyebrow="">/);
  assert.doesNotMatch(healthPage, /description="Production integrity/);
  assert.match(healthPage, /aria-label="CMS health summary"/);
  assert.match(healthPage, /max-w-\[720px\]/);
  assert.match(healthPage, /Healthy/);
  assert.match(healthPage, /Needs attention/);
  assert.match(healthPage, /Fallback retired/);
  assert.match(healthPage, /Total records/);
  assert.match(healthPage, /overview\.totals\.retiredFallback/);
  assert.doesNotMatch(healthPage, /Fallback active|fallback active/);
  assert.doesNotMatch(healthPage, /label="Unpublished changes"/);
  assert.ok((healthPage.match(/text-\[#020617\].*overview\.totals\./g) || []).length >= 3);
  assert.match(healthPage, /const cmsHealthGroups = \[/);
  assert.match(healthPage, /Homepage destinations/);
  assert.match(healthPage, /Flight routes/);
  assert.match(healthPage, /Hotel destinations/);
  assert.match(healthPage, /FAQs/);
  assert.match(healthPage, /open=\{needsAttention > 0\}/);
  assert.match(healthPage, /getCmsMarketName/);
  assert.match(healthPage, /getCmsLocaleName/);
  assert.match(healthPage, />CMS market</);
  assert.match(healthPage, />Legacy fallback</);
  assert.match(healthPage, />Draft changes</);
  assert.doesNotMatch(healthPage, /AdminDataTable/);
  assert.match(healthPage, /table-fixed text-left text-\[13px\]/);
  assert.match(healthPage, /marketName=\{getCmsMarketName\(entry\.market\)\}/);
  assert.match(healthPage, /localeName=\{getCmsLocaleName\(entry\.locale\)\}/);
  assert.match(healthPage, /CmsScopeHealthRow/);
  assert.doesNotMatch(healthPage, />Actions<\/th>/);
  assert.doesNotMatch(healthPage, /<small>|<\/small>/);
  assert.match(healthRow, /\{market\} · \{locale\} · v\{integrity\.scopeVersion \?\? "—"\}/);
  assert.match(healthRow, /aria-expanded=\{expanded\}/);
  assert.match(healthRow, /onClick=\{toggleDetails\}/);
  assert.match(healthRow, /onKeyDown=\{handleRowKeyDown\}/);
  assert.match(healthRow, /tabIndex=\{0\}/);
  assert.match(healthRow, /cursor-pointer/);
  assert.doesNotMatch(healthRow, /ChevronDown/);
  assert.match(healthRow, /health details/);
  assert.match(healthRow, />No issues</);
  assert.match(healthRow, /integrity\.unpublishedChanges === 0/);
  assert.match(healthRow, /integrity\.invalidDrafts\.map/);
  assert.match(healthRow, /integrity\.invalidPublished\.map/);
  assert.match(healthRow, /integrity\.orphanPublished\.map/);
  assert.match(healthRow, /integrity\.draftOrderCollisions\.map/);
  assert.match(healthRow, /integrity\.publishedOrderCollisions\.map/);
  assert.match(healthRow, /mode="normalize"/);
  assert.match(healthRow, /CmsHealthInlineRepair/);
  assert.match(inlineRepair, /\/api\/admin\/content\/\$\{encodeURIComponent\(itemId\)\}/);
  assert.match(inlineRepair, /HomepageCmsEditor/);
  assert.match(inlineRepair, /FaqCmsEditor/);
  assert.match(hardeningActions, /draftOrderNeedsNormalization \|\| draftOrderCollisionCount > 0/);
  assert.match(hardeningActions, /mode === "normalize"/);
  assert.match(hardeningService, /summarizeIntegrityIssues/);
  assert.match(hardeningService, /details: summarizeIntegrityIssues/);
  assert.match(hardeningService, /\n\s*items,\n/);
  assert.match(hardeningActions, /aria-haspopup="menu"/);
  assert.match(hardeningActions, /role="menu"/);
  assert.match(hardeningActions, /Retire fallback/);
  assert.match(hardeningActions, /Reactivate fallback/);
  assert.doesNotMatch(hardeningActions, /Retire legacy fallback/);
  assert.doesNotMatch(hardeningActions, /Reactivate legacy fallback/);
  assert.doesNotMatch(hardeningActions, /disabled=\{pending \|\| \(!draftOrderNeedsNormalization && draftOrderCollisionCount === 0\)\}/);
  const diagnostic = readFileSync("src/lib/adminCmsScopeDiagnostics.ts", "utf8");
  assert.match(diagnostic, /for \(const market of new Set\(markets\)\)/);
  assert.match(diagnostic, /type: "HOMEPAGE_DESTINATION"/);
  assert.match(diagnostic, /type: "FLIGHT_ROUTE"/);
  assert.match(diagnostic, /type: "HOTEL_DESTINATION", market: "GLOBAL"/);
  assert.match(diagnostic, /!storedKeys\.has\(key\(scope\)\)/);
  assert.match(healthPage, /href="\/admin\/system"/);
  assert.match(healthPage, /Back to System/);
  assert.doesNotMatch(healthPage, /View audit logs/);
  assert.match(adminNavigation, /href: "\/admin\/logs", label: "Audit Logs"/);
  assert.doesNotMatch(adminNavigation, /href: "\/admin\/logs", parentHref: "\/admin\/system"/);
  assert.match(adminNavigation, /href: "\/admin\/system\/cms-health"/);
  assert.doesNotMatch(adminNavigation, /href: "\/admin\/system\/cms-health", parentHref: "\/admin\/system"/);
  assert.match(legacyHealthPage, /redirect\("\/admin\/system\/cms-health"\)/);
  assert.doesNotMatch(contentPage, /\/admin\/content\/health/);
});

test("edit conflicts provide an explicit recovery path", () => {
  for (const editor of [faqEditor, homepageEditor]) {
    assert.match(editor, /response\.status === 409/);
    assert.match(editor, /Reload latest/);
    assert.match(editor, /window\.location\.reload\(\)/);
  }
});

test("System browser QA mock includes every required CMS Health response field", () => {
  const browserQa = readFileSync("qa/admin-system-cleanup/run.mjs", "utf8");
  const healthSource = readFileSync("src/app/admin/system/cms-health/page.tsx", "utf8");
  assert.match(healthSource, /overview\.missingHomepageScopes\.length/);
  assert.match(browserQa, /getCmsHealthOverview\(\)\{return \{available:true,totals:/);
  assert.match(browserQa, /scopes:\[\],missingHomepageScopes:\[\]/);
});
