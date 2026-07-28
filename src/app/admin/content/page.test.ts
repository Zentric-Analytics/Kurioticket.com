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

test("Homepage Operations renders the compact authorised-admin workspace", () => {
  assert.match(homepageOperationsPage, /AdminHomepageOperationsPage/);
  assert.match(homepageOperationsPage, /<HomepageFaresRefreshCard \/>/);
  assert.match(refreshCard, /title="Homepage Operations"/);
  assert.doesNotMatch(refreshCard, /Monitor homepage readiness/);
  for (const value of [
    "Overall status",
    "Last refresh",
    "Markets ready",
    "Missing routes",
    "Failed routes",
  ]) {
    assert.match(refreshCard, new RegExp(value, "i"));
  }
  assert.equal(refreshCard.match(/<HomepageOperationsStatusBar/g)?.length, 1);
  assert.doesNotMatch(refreshCard, /<OperationalHealthPanel/);
  assert.doesNotMatch(
    refreshCard,
    /Operational overview|Homepage health at a glance|ADMIN OPERATIONS/,
  );
  assert.doesNotMatch(refreshCard, /number="0[1-4]"|bg-slate-950|bg-gradient/);
});

test("Homepage Operations preserves controls, APIs, filters, and route inspection", () => {
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/status"'));
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/refresh"'));
  assert.match(refreshCard, /method: "POST"/);
  assert.match(refreshCard, /credentials: "include"/);
  assert.match(refreshCard, /Refresh fares/);
  assert.match(refreshCard, /: "Reload"/);
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
  ]) {
    assert.match(refreshCard, new RegExp(`label: "${filter}"`));
  }
  assert.match(refreshCard, /Inspect .* routes/);
  assert.match(refreshCard, /View all filtered routes/);
  assert.match(refreshCard, /Usable includes fresh and last-known-good routes/);
  assert.doesNotMatch(refreshCard, /label: "Ready"|label: "Underfilled"|label: "Stale"/);
});

test("Homepage Operations presents route filters as a local responsive workspace", () => {
  assert.match(refreshCard, />\s*Filter routes\s*</);
  assert.match(refreshCard, /label: "Coverage issues"/);
  assert.match(refreshCard, /label: "Route availability"/);
  assert.match(refreshCard, /aria-label="Route status filters"/);
  assert.match(refreshCard, /aria-pressed=\{selected\}/);
  assert.match(refreshCard, /md:sticky md:top-24/);
  assert.match(refreshCard, /md:grid-cols-\[13\.5rem_minmax\(0,1fr\)\]/);
  assert.match(refreshCard, /<details className="group rounded-xl[^>]+md:hidden/);
  assert.match(refreshCard, /<RouteFilterControls[\s\S]+counts=\{routeFilterCounts\}/);
  assert.match(refreshCard, /filterAdminHomepageFareMarketsByRouteGroups\([\s\S]+\)\.length/);
});

test("Homepage Operations sequences status loads and presents unavailable or stale data safely", () => {
  assert.match(refreshCard, /createHomepageFareStatusRequestCoordinator/);
  assert.match(refreshCard, /request: fetchHomepageFareStatus/);
  assert.match(refreshCard, /signal,/);
  assert.match(refreshCard, /disabled=\{refreshing \|\| statusState\.loading\}/);
  assert.match(refreshCard, /if \(refreshingRef\.current\) return/);
  assert.match(refreshCard, /Status data is stale/);
  assert.match(refreshCard, /lastSuccessfulLoadAt/);
  assert.match(refreshCard, /statusState\.data \? statusPayload\.summary\.missing : "—"/);
  assert.match(refreshCard, /statusState\.data \? statusPayload\.summary\.failed : "—"/);
  assert.match(refreshCard, /await loadStatus\(\)/);
  assert.ok(refreshCard.indexOf("setRefreshState({") < refreshCard.indexOf("await loadStatus()"));
});

test("Homepage Operations classifies and announces each manual refresh outcome", () => {
  assert.match(refreshCard, /classifyHomepageFareRefreshOutcome\(counts\)/);
  assert.match(refreshCard, /setRefreshState\(\{ counts: null, outcome: null \}\)/);
  assert.match(refreshCard, /createHomepageFareRefreshFailureOutcome/);
  assert.match(refreshCard, /SafeHomepageFareRefreshError/);
  assert.match(refreshCard, /outcome\.primaryMessage/);
  assert.match(refreshCard, /outcome\.details\.join/);
  assert.match(refreshCard, /outcome\.explanation/);
  assert.match(refreshOutcome, /Refresh completed successfully/);
  assert.match(refreshOutcome, /Refresh completed with issues/);
  assert.match(refreshOutcome, /Refresh failed/);
  assert.match(refreshOutcome, /bg-amber-50 text-amber-700/);
  assert.match(refreshOutcome, /bg-emerald-50 text-emerald-700/);
  assert.match(refreshOutcome, /bg-rose-50 text-rose-700/);
});

test("Homepage Operations collapses developer diagnostics, fallback pools, and raw debug by default", () => {
  assert.match(refreshCard, /label="Developer diagnostics"/);
  assert.match(refreshCard, /label="Additional health details"/);
  assert.match(refreshCard, /label="Refresh Status"/);
  assert.match(refreshCard, /<FallbackPoolsSection/);
  assert.match(refreshCard, />\s*Raw debug details\s*</);
  const developerDiagnostics = refreshCard.slice(
    refreshCard.indexOf('<OperationsDisclosure label="Developer diagnostics">'),
    refreshCard.indexOf("const STATUS_BADGE_STYLES"),
  );
  assert.match(developerDiagnostics, /<DiagnosticsPanel/);
  assert.match(developerDiagnostics, /<FallbackPoolsSection/);
  assert.match(developerDiagnostics, /<RawDebugDetails/);
  assert.match(operationsPanels, /<details/);
  assert.doesNotMatch(operationsPanels, /<details[^>]*\sopen/);
});

test("Homepage Operations keeps route expiry distinct from stale retained page data", () => {
  assert.match(refreshCard, /\{ key: "stale", label: "Expired" \}/);
  assert.match(refreshCard, /Status data is stale/);
  assert.doesNotMatch(refreshCard, /Status data is expired/);
});

test("Homepage Operations presents accurate attention and manual provider-call states", () => {
  assert.match(refreshCard, /All markets are currently covered/);
  assert.match(refreshCard, /if \(affectedCount === 0\)/);
  assert.match(refreshCard, /\{affectedCount\} markets require attention/);
  assert.match(refreshCard, /Provider calls in latest manual refresh/);
  assert.match(refreshCard, /latestCounts\.providerCalls/);
  assert.doesNotMatch(refreshCard, /label: "Provider calls"/);
});

test("Homepage Operations closes and reopens the route inspector without resetting filters", () => {
  assert.match(refreshCard, /Close inspector/);
  assert.match(refreshCard, /onClose=\{\(\) => setSelectedRouteScope\(null\)\}/);
  assert.match(refreshCard, /\{activeSelectedRouteScope \? \(/);
  assert.match(refreshCard, /onClick=\{\(\) =>\s*selectRouteScope\(ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE\)/);
  assert.match(refreshCard, /onClick=\{\(\) => onInspectMarket\(market\.marketCode\)\}/);
  assert.doesNotMatch(refreshCard, /onClose[\s\S]{0,120}setRouteFilter|onClose[\s\S]{0,120}setShowAffectedMarkets/);
});

test("Homepage Operations uses operator-facing filter empty states", () => {
  assert.match(refreshCard, /No markets currently have usable routes/);
  assert.match(refreshCard, /No markets have missing or expired routes/);
  assert.match(refreshCard, /No markets contain expired routes/);
});

test("compact market cards retain essential fields without technical metrics", () => {
  const card = refreshCard.slice(
    refreshCard.indexOf("function MarketReadinessCard"),
    refreshCard.indexOf("function DiagnosticsPanel"),
  );
  for (const metric of [
    "Coverage",
    "Freshness",
    "Missing",
    "Failed",
    "Inspect",
  ])
    assert.match(card, new RegExp(metric));
  assert.doesNotMatch(
    card,
    /Provider calls|Candidates|Popular|Discovery|Backup|Last-known-good|Timeout|Unavailable|Attempts|Replacements|Cooldown/,
  );
  assert.match(refreshCard, /grid gap-4 lg:grid-cols-2/);
  assert.match(card, /aria-pressed=\{selected\}/);
  assert.match(card, /border-\[#004BB8\][^\n]+ring-2/);
});

test("issue summary filters affected markets without a duplicate country list", () => {
  assert.match(refreshCard, /function IssueSummary/);
  assert.match(refreshCard, /Show affected markets/);
  assert.match(
    refreshCard,
    /setShowAffectedMarkets\(\(current\) => !current\)/,
  );
  assert.match(
    refreshCard,
    /showAffectedMarkets[\s\S]*?routeFilteredMarkets\.filter/,
  );
  assert.match(
    refreshCard,
    /filterAdminHomepageFareMarketsByRouteGroups\([\s\S]*?publicMarkets,[\s\S]*?marketRouteGroups,[\s\S]*?routeFilter/,
  );
  assert.match(
    refreshCard,
    /resolveAdminHomepageFareActiveRouteScope\([\s\S]*?selectedScope: selectedRouteScope,[\s\S]*?visibleMarkets: routeFilteredMarkets/,
  );
  assert.doesNotMatch(refreshCard, /Attention Required/);
  assert.doesNotMatch(refreshCard, /affectedMarkets\.slice/);
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
  assert.match(systemPage, /Feature Flags/);
  assert.doesNotMatch(systemPage, /homepage fare/i);
  assert.match(settingsPage, /redirect\("\/admin\/system"\)/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
});

test("homepage fare refresh component keeps existing client APIs, scopes, and status messaging", () => {
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/status"'));
  assert.ok(refreshCard.includes('fetch("/api/admin/homepage-fares/refresh"'));
  assert.match(refreshCard, /Loading homepage fare snapshot status/);
  assert.match(refreshCard, /Could not refresh homepage fares/);
  assert.match(refreshCard, /Refresh fares/);
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
