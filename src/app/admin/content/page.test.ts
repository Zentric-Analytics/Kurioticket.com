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

test("Homepage Operations uses product typography and restrained card styling", () => {
  assert.match(homepageOperationsPage, /<HomepageFaresRefreshCard \/>/);
  assert.match(refreshCard, /title="Homepage Operations"/);
  assert.match(
    refreshCard,
    /space-y-5 pb-4 text-slate-950/,
  );
  assert.doesNotMatch(refreshCard, /font-family|fontFamily/);
  assert.match(operationsPanels, /data-layout="flat-summary"/);
  assert.match(refreshCard, /rounded-lg border border-slate-200 bg-white/);
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

test("Homepage Operations retains every route filter and results-style radio treatment", () => {
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
    /text-\[12px\] font-extrabold uppercase[^\n]+tracking-\[0\.12em\]/,
  );
  assert.match(refreshCard, /rounded-full border/);
  assert.match(refreshCard, /aria-pressed=\{selected\}/);
  assert.match(refreshCard, /md:sticky md:top-24/);
  assert.match(refreshCard, /rounded-lg border border-slate-200 bg-white p-5 shadow-sm/);
  assert.match(refreshCard, /filterAdminHomepageFareMarketsByRouteGroups/);
});

test("Homepage Operations renders markets as responsive flat rows", () => {
  assert.match(refreshCard, /data-market-row/);
  assert.match(
    refreshCard,
    /role="table"[\s\S]{0,80}aria-label="Market coverage"/,
  );
  assert.match(refreshCard, /MarketReadinessRow/);
  assert.doesNotMatch(refreshCard, /MarketReadinessCard/);
  assert.match(refreshCard, /border-b border-black py-4/);
  assert.match(refreshCard, /md:grid-cols-\[minmax\(10rem,2fr\)/);
  assert.match(refreshCard, /Inspect routes/);
});

test("Homepage Operations preserves affected markets and Route Inspector behavior", () => {
  assert.match(refreshCard, /Show affected markets/);
  assert.doesNotMatch(refreshCard, /markets require attention/);
  assert.doesNotMatch(refreshCard, /missing routes ·/);
  assert.doesNotMatch(refreshCard, /failed routes`/);
  assert.match(
    refreshCard,
    /setShowAffectedMarkets\(\(current\) => !current\)/,
  );
  assert.match(refreshCard, /View all filtered routes/);
  assert.match(refreshCard, /Route Inspector/);
  assert.match(refreshCard, /Close inspector/);
  assert.match(
    refreshCard,
    /onClose=\{\(\) => setSelectedRouteScope\(null\)\}/,
  );
  assert.match(refreshCard, /paginateAdminHomepageFareRoutes/);
  assert.match(refreshCard, /overflow-x-auto overscroll-x-contain/);
});

test("Homepage Operations shows the full Last refresh date without a search prefix", () => {
  assert.match(refreshCard, /return formatDateTime\(value\)/);
  assert.doesNotMatch(refreshCard, /`Searched \$\{formatDateTime\(value\)\}`/);
  assert.match(operationsPanels, /minmax\(10rem,1\.35fr\)/);
  assert.match(operationsPanels, /whitespace-normal text-lg/);
  assert.doesNotMatch(operationsPanels, /truncate text-lg/);
});

test("Homepage Operations keeps plain secondary disclosures collapsed", () => {
  assert.match(refreshCard, /label="Additional health details"/);
  assert.match(refreshCard, /label="Developer diagnostics"/);
  assert.match(operationsPanels, /<details/);
  assert.doesNotMatch(operationsPanels, /<details[^>]*\sopen/);
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
