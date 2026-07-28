import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contentPage = readFileSync("src/app/admin/content/page.tsx", "utf8");
const homepageOperationsPage = readFileSync(
  "src/app/admin/homepage-operations/page.tsx",
  "utf8",
);
const adminLayout = readFileSync("src/app/admin/layout.tsx", "utf8");
const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const refreshCard = readFileSync(
  "src/components/admin/HomepageFaresRefreshCard.tsx",
  "utf8",
);
const operationsPanels = readFileSync(
  "src/components/admin/homepage-operations/HomepageOperationsPanels.tsx",
  "utf8",
);
const refreshOutcome = readFileSync(
  "src/lib/admin/homepageFareRefreshOutcome.ts",
  "utf8",
);
const statusApi = readFileSync(
  "src/app/api/admin/homepage-fares/status/route.ts",
  "utf8",
);
const refreshApi = readFileSync(
  "src/app/api/admin/homepage-fares/refresh/route.ts",
  "utf8",
);

test("Content Inventory retains content sections without homepage fare operations", () => {
  assert.match(contentPage, /title="Content Inventory"/);
  assert.match(
    contentPage,
    /Review the public content currently available across Kurioticket\./,
  );
  assert.doesNotMatch(
    contentPage,
    /HomepageFaresRefreshCard|homepage fare|Production readiness|Cron status|Public market coverage/i,
  );

  for (const section of [
    "Homepage destination cards",
    "Flight route cards",
    "Hotel destination cards",
    "Car pickup cards",
    "FAQs",
    "Trust messages",
  ]) {
    assert.match(contentPage, new RegExp(section));
  }

  assert.doesNotMatch(contentPage, /Public Content Management/);
  assert.doesNotMatch(contentPage, /Content Management/);
  assert.doesNotMatch(
    contentPage,
    /Create content|Edit content|Delete content|Upload image|Approve content/i,
  );
});

test("Homepage Operations uses the shared admin shell, cards, and typography", () => {
  assert.match(homepageOperationsPage, /<HomepageFaresRefreshCard \/>/);
  assert.match(refreshCard, /title="Homepage Operations"/);
  assert.match(
    refreshCard,
    /<AdminPageShell eyebrow="" title="Homepage Operations">/,
  );
  assert.doesNotMatch(refreshCard, /font-family|fontFamily/);
  assert.match(operationsPanels, /data-layout="flat-summary"/);
  assert.ok((refreshCard.match(/<AdminSectionCard/g) ?? []).length >= 4);
  assert.doesNotMatch(refreshCard, /rounded-lg|shadow-sm|text-black|border-black|text-blue-700/);
});

test("Homepage Operations removes all page-level manual refresh UI", () => {
  assert.doesNotMatch(
    refreshCard,
    /fetch\("\/api\/admin\/homepage-fares\/refresh"/,
  );
  assert.doesNotMatch(refreshCard, />Refresh fares</);
  assert.doesNotMatch(refreshCard, />Reload</);
  assert.doesNotMatch(refreshCard, /label="Refresh Status"/);
  assert.match(refreshOutcome, /Refresh completed successfully/);
  assert.match(refreshApi, /refreshPhase3AHomepageFareSnapshots/);
});

test("Homepage Operations automatically loads status with stale request protection", () => {
  assert.match(refreshCard, /createHomepageFareStatusRequestCoordinator/);
  assert.match(refreshCard, /request: fetchHomepageFareStatus/);
  assert.match(refreshCard, /void loadStatus\(\)/);
  assert.match(refreshCard, /statusRequestCoordinator\.dispose\(\)/);
  assert.match(refreshCard, /signal/);
  assert.match(refreshCard, /Status data is stale/);
  assert.match(refreshCard, /lastSuccessfulLoadAt/);
});

test("Homepage Operations retains every route filter with shared admin control styling", () => {
  for (const filter of [
    "All",
    "Usable",
    "Needs coverage",
    "Failed",
    "Missing",
    "Expired",
    "Last-known-good",
    "Fresh",
    "Unavailable",
  ])
    assert.match(refreshCard, new RegExp(`label:\\s*"${filter}"`));
  assert.match(refreshCard, /label: "Coverage issues"/);
  assert.match(refreshCard, /label: "Route availability"/);
  assert.match(
    refreshCard,
    /text-xs font-semibold uppercase tracking-wide text-slate-500/,
  );
  assert.match(refreshCard, /rounded-full border/);
  assert.match(refreshCard, /aria-pressed=\{selected\}/);
  assert.match(refreshCard, /md:sticky md:top-24/);
  assert.match(refreshCard, /<AdminSectionCard[\s\S]{0,80}className="p-5"/);
  assert.match(refreshCard, /border-\[5px\] border-indigo-600/);
  assert.match(refreshCard, /filterAdminHomepageFareMarketsByRouteGroups/);
});

test("Homepage Operations renders markets with shared responsive table styling", () => {
  assert.match(refreshCard, /data-market-row/);
  assert.match(refreshCard, /<table[\s\S]{0,180}aria-label="Market coverage"/);
  assert.match(refreshCard, /<caption className="sr-only">Market coverage<\/caption>/);
  assert.match(refreshCard, /<th[\s\S]{0,100}scope="col"/);
  assert.match(refreshCard, /<tbody[\s\S]{0,500}<MarketReadinessRow/);
  assert.match(refreshCard, /MarketReadinessRow/);
  assert.doesNotMatch(refreshCard, /MarketReadinessCard/);
  assert.match(refreshCard, /bg-slate-50\/95 text-xs text-slate-500/);
  assert.doesNotMatch(refreshCard, /grid-cols-\[minmax\(10rem,2fr\)/);
  assert.match(refreshCard, /overflow-x-auto overscroll-x-contain/);
  assert.match(refreshCard, /<AdminButton[\s\S]{0,180}variant="secondary"[\s\S]{0,80}size="sm"[\s\S]{0,80}Inspect routes/);
});

test("Homepage Operations omits the market toolbar and preserves Route Inspector behavior", () => {
  assert.doesNotMatch(refreshCard, /Show affected markets/);
  assert.doesNotMatch(refreshCard, /Show all markets/);
  assert.doesNotMatch(refreshCard, /markets require attention/);
  assert.doesNotMatch(refreshCard, /missing routes ·/);
  assert.doesNotMatch(refreshCard, /failed routes`/);
  assert.doesNotMatch(refreshCard, /View all filtered routes/);
  assert.match(refreshCard, /Route Inspector/);
  assert.match(refreshCard, /Close inspector/);
  assert.match(refreshCard, /<AdminStatusBadge/);
  assert.doesNotMatch(refreshCard, /STATUS_BADGE_STYLES/);
  assert.match(
    refreshCard,
    /onClose=\{\(\) => setSelectedRouteScope\(null\)\}/,
  );
  assert.match(refreshCard, /paginateAdminHomepageFareRoutes/);
  assert.match(refreshCard, /overflow-x-auto overscroll-x-contain/);
});

test("Homepage Operations shows when status was last loaded successfully", () => {
  assert.match(refreshCard, /label: "Status last updated"/);
  assert.doesNotMatch(refreshCard, /label: "Fare data last refreshed"/);
  assert.match(
    refreshCard,
    /statusState\.lastSuccessfulLoadAt[\s\S]{0,100}formatDateTime\(statusState\.lastSuccessfulLoadAt\)/,
  );
  assert.doesNotMatch(refreshCard, /formatSnapshotTime\(statusPayload\.lastRefreshAt\)/);
  assert.match(refreshCard, /statusState\.loading[\s\S]{0,30}"Loading…"/);
  assert.match(refreshCard, /"Loading…"[\s\S]{0,30}"Unavailable"/);
  assert.match(operationsPanels, /minmax\(10rem,1\.35fr\)/);
  assert.match(operationsPanels, /whitespace-normal text-lg/);
  assert.doesNotMatch(operationsPanels, /truncate text-lg/);
});

test("Homepage Operations ends after market coverage and the optional route inspector", () => {
  assert.doesNotMatch(refreshCard, /Additional health details/);
  assert.doesNotMatch(refreshCard, /Developer diagnostics/);
  assert.doesNotMatch(refreshCard, /Fallback-only coverage pools/);
  assert.doesNotMatch(refreshCard, /Inspect fallback routes/);
  assert.doesNotMatch(refreshCard, /Raw debug details/);
  assert.doesNotMatch(
    refreshCard,
    /DiagnosticsPanel|FallbackPoolsSection|RawDebugDetails/,
  );
  assert.doesNotMatch(refreshCard, /label="Refresh Status"/);
});

test("Homepage Operations keeps the existing admin permission boundary", () => {
  assert.match(adminLayout, /requireAdminSession\("\/admin"\)/);
  assert.doesNotMatch(
    homepageOperationsPage,
    /requireAdminSession|roles|permissions|authorization/i,
  );
});

test("System page owns settings visibility without restoring homepage fare refresh", () => {
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard/);
  assert.match(systemPage, /Admin Configuration/);
  assert.match(settingsPage, /redirect\("\/admin\/system"\)/);
});

test("homepage fare admin APIs preserve authorization, audit logging, and refresh scope behavior", () => {
  assert.match(statusApi, /requireAdminApiSession\(\)/);
  assert.match(statusApi, /readHomepageFareSnapshotStatus\(\)/);

  assert.match(refreshApi, /requireAdminApiSession\(\)/);
  assert.match(refreshApi, /refreshPhase3AHomepageFareSnapshots/);
  assert.match(refreshApi, /writeAdminAuditLog/);
  assert.match(refreshApi, /HOMEPAGE_FARES_REFRESHED/);
  assert.match(refreshApi, /targetType: AUDIT_TARGET_TYPE/);
  for (const scope of [
    "popular",
    "discover",
    "discover-default",
    "discover-first-6",
    "all-phase-3a",
  ]) {
    assert.match(refreshApi, new RegExp(scope));
  }
});
