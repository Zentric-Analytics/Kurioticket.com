import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/page.tsx", "utf8");
const dashboard = readFileSync("src/components/admin/AdminOverviewDashboard.tsx", "utf8");
const controls = readFileSync("src/components/admin/AdminOverviewControls.tsx", "utf8");
const display = dashboard.slice(dashboard.indexOf("export function AdminOverviewDashboard("));

test("overview uses existing canonical services without mocked counts", () => {
  assert.match(page, /getAdminOverview\(query\)/);
  assert.match(page, /getSafeSystemStatus\(\)/);
  assert.match(page, /getRecentAdminActivity\(\)/);
  assert.match(page, /getAdminOverview[\s\S]*?AdminOverviewDashboard/);
  assert.match(page, /No fallback or mocked operational totals are shown/);
  assert.match(page, /AdminOverviewSecondary system=\{system\} activity=\{activity\} modules=\{modules\}/);
});

test("six original KPIs and their sources are retained in the snapshot", () => {
  for (const [label, expression] of [
    ["Total users", "data.users.total"],
    ["Enabled accounts", "data.users.active"],
    ["Support attention", "supportAttention"],
    ["Deletion attention", "deletionAttention"],
    ["Journeys", "data.journeys.journeys"],
    ["Admin actions", "data.adminActions"],
  ]) {
    assert.ok(display.includes('label="' + label + '" value={' + expression + "}"), label);
  }
  assert.match(display, /supportAttention = data\.support\.open \+ data\.support\.waitingOnTeam \+ data\.support\.waitingOnUser/);
  assert.match(display, /deletionAttention = data\.deletions\.pending \+ data\.deletions\.readyForReview/);
});

test("admin overview sections prioritize action and health over deeper analytics", () => {
  const sequence = [
    'aria-label="Operations Snapshot"',
    'aria-label="Attention Required"',
    "<PlatformHealth system={system} />",
    'aria-label="Provider Operational Health"',
    'aria-label="Customer Journey Funnel"',
    'title="Support Workload"',
    'title="Account Deletion Workload"',
    "<ActivityFeed activity={activity} />",
    "<QuickActions modules={modules} />",
  ];
  const indexes = sequence.map((label) => {
    const found = display.indexOf(label);
    assert.ok(found > -1, "missing dashboard section: " + label);
    return found;
  });
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
});

test("journey funnel and both correlation metrics retain accurate source data", () => {
  for (const key of ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"]) {
    assert.match(display, new RegExp("funnel\\." + key + "\\.journeys"));
    assert.match(display, new RegExp("funnel\\." + key + "\\.events"));
  }
  for (const field of [
    "data.journeys.identities.registered",
    "data.journeys.identities.guests",
    "data.journeys.operationalSearches.total",
    "data.journeys.operationalSearches.failed",
    "data.journeys.operationalSearches.partial",
    "data.journeys.handoffCorrelation.exactEvents",
    "data.journeys.handoffCorrelation.uncorrelatedEvents",
  ]) assert.ok(display.includes(field), field);
  assert.match(display, /Stage counts are distinct consented journeys, not percentages of all operational searches/);
  assert.match(display, /No nearest-by-time inference/);
});

test("provider detailed information remains available for every provider", () => {
  assert.match(display, /data\.providers\.map\(\(provider\) => <ProviderCard key=\{provider.id\} provider=\{provider\} \/>/);
  for (const field of [
    "provider.id", "provider.provider", "provider.readinessState", "provider.operationalState",
    "provider.windowHours", "provider.totalCalls", "provider.successCalls", "provider.degradedCalls",
    "provider.failedCalls", "provider.disabledCalls", "provider.averageLatencyMs",
    "provider.lastActivityAt", "provider.lastSuccessAt", "provider.lastFailureAt",
  ]) assert.ok(dashboard.includes(field), field);
  assert.match(dashboard, /Full provider details/);
});

test("support, deletion, platform checks, audit activity, and all original module links remain", () => {
  for (const name of [
    "data.support.open", "data.support.waitingOnTeam", "data.support.waitingOnUser",
    "data.support.resolvedOrClosed", "data.deletions.pending", "data.deletions.readyForReview",
    "data.deletions.cancelled", "data.deletions.completed",
    "system.databaseConnected", "system.databaseConfigured", "system.authConfigured",
    "system.sessionConfigured", "system.emailConfigured", "system.providerCredentialsPresent",
  ]) assert.ok(dashboard.includes(name), name);

  assert.match(dashboard, /activity\.map\(\(item\) =>/);
  assert.match(dashboard, /modules\.map\(\(module\) =>/);
  assert.match(dashboard, /All admin modules \(\{modules.length\}\)/);
  for (const route of [
    "/admin/users", "/admin/providers", "/admin/searches", "/admin/redirects",
    "/admin/support", "/admin/account-deletions", "/admin/content",
    "/admin/logs", "/admin/system",
  ]) assert.ok(page.includes('"' + route + '"'), route);
});

test("range controls remain bounded and refresh does not claim a live feed", () => {
  assert.match(page, /selected === "24h" \|\| selected === "30d" \? selected : "7d"/);
  assert.match(page, /24 \* 60 \* 60 \* 1000 : 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(controls, /router\.push\(/);
  assert.match(controls, /router\.refresh\(\)/);
  assert.match(controls, /Reporting range/);
  assert.match(controls, /Snapshot checked/);
  assert.doesNotMatch(dashboard, /vs last 7 days|\+12%|99\.2%/);
});


test("recent activity is disclosed as consented observation rather than a live-user claim", () => {
  assert.match(display, /data\\.visitorActivity\\.observedVisitorIdentities/);
  assert.match(display, /Recently observed visitors \\(5 min\\)/);
  assert.match(display, /not a verified count of everyone currently online/);
  assert.doesNotMatch(display, /hint="Currently active"/);
});


test("canonical overview reads consented recent visitor identities without overwriting account status", () => {
  const service = readFileSync("src/services/adminOverviewService.ts", "utf8");
  assert.match(service, /tx\\.visitor\\.count\\(/);
  assert.match(service, /consentStatus: "GRANTED"/);
  assert.match(service, /trackingDisabledAt: null/);
  assert.match(service, /lastSeenAt: \\{ gte: recentVisitorCutoff, lte: now \\}/);
  assert.match(service, /active: userCount\\.get\\("ACTIVE"\\)/);
});
