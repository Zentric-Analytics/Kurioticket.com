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
  assert.match(page, /AdminOverviewSecondary system=\{system\} activity=\{activity\}/);
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

test("support, deletion, health, and audit data survive the removal of shortcut cards", () => {
  for (const name of [
    "data.support.open", "data.support.waitingOnTeam", "data.support.waitingOnUser",
    "data.support.resolvedOrClosed", "data.deletions.pending", "data.deletions.readyForReview",
    "data.deletions.cancelled", "data.deletions.completed",
    "system.databaseConnected", "system.databaseConfigured", "system.authConfigured",
    "system.sessionConfigured", "system.emailConfigured", "system.providerCredentialsPresent",
  ]) assert.ok(dashboard.includes(name), name);
  assert.match(dashboard, /activity\.map\(\(item\) =>/);
  assert.doesNotMatch(dashboard, /QuickActions|All admin modules|Admin shortcuts and modules/);
  assert.doesNotMatch(page, /adminNavigation\.filter|modules=\{modules\}/);
  assert.match(dashboard, /href="\/admin\/support"/);
  assert.match(dashboard, /href="\/admin\/providers"/);
  assert.match(dashboard, /href="\/admin\/account-deletions"/);
});

test("only the Overview hides its visible page introduction", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(page, /title="Operations Dashboard"/);
  assert.match(page, /hideHeader/);
  assert.doesNotMatch(page, /Monitor Kurioticket operations, customer journeys/);
  assert.match(shell, /hideHeader = false/);
  assert.match(shell, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(shell, /<AdminPageHeader eyebrow=\{eyebrow\} title=\{title\}/);
});

test("requested descriptions are removed without altering operational sources", () => {
  for (const message of [
    "Account totals and action queues are current;",
    "Items derived from current ticket, deletion and provider states.",
    "Readiness shows whether a provider may run;",
    "Consented journey progression. Outbound provider handoffs",
    "Operational search records · Selected reporting range",
    "Only verifiable search-to-handoff associations",
    "Open the most-used operations, or expand the complete module directory below.",
  ]) assert.ok(!dashboard.includes(message), message);
  assert.ok(display.includes("data.journeys.operationalSearches.total"));
  assert.ok(display.includes("data.journeys.handoffCorrelation.exactEvents"));
  assert.ok(display.includes("data.visitorActivity.observedVisitorIdentities"));
  assert.ok(display.includes("AdminOverviewRangeSelect"));
  assert.ok(display.includes("AdminOverviewAutoRefresh"));
});

test("compact range selector sits in Operations Snapshot and the top toolbar is gone", () => {
  assert.match(page, /selected === "24h" \|\| selected === "30d" \? selected : "7d"/);
  assert.match(page, /24 \* 60 \* 60 \* 1000 : 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(display, /<AdminOverviewAutoRefresh \/>/);
  assert.match(display, /title="Operations Snapshot"[\s\S]*?action=\{<AdminOverviewRangeSelect range=\{range\} \/>\}/);
  assert.match(controls, /export function AdminOverviewRangeSelect/);
  assert.match(controls, /router\.push\(/);
  assert.match(controls, /Overview reporting range/);
  assert.doesNotMatch(controls, /Snapshot checked|Environment|RefreshCw|>Refresh<|Refreshing…/);
  assert.doesNotMatch(dashboard, /<AdminOverviewControls/);
  assert.doesNotMatch(dashboard, /vs last 7 days|\+12%|99\.2%/);
});

test("Overview information is presented without boxed white card containers", () => {
  assert.doesNotMatch(dashboard, /AdminSectionCard|AdminEmptyState|<Card/);
  assert.doesNotMatch(page, /AdminEmptyState/);
  assert.match(display, /<MetricCard label="Total users"/);
  assert.match(display, /<AttentionCard href="\/admin\/providers"/);
  assert.match(display, /<PlatformHealth system=\{system\} \/>/);
  assert.match(display, /<ProviderCard key=\{provider.id\}/);
  assert.match(display, /<FunnelStep label="Search completed"/);
  assert.match(display, /<WorkloadCard title="Support Workload"/);
  assert.match(display, /<ActivityFeed activity=\{activity\} \/>/);
  assert.match(dashboard, /border-b border-slate-200/);
  assert.match(dashboard, /border-t border-slate-200/);
  assert.match(dashboard, /<details className="mt-3 border-t border-slate-200\/80">/);
});

test("invisible automatic refresh retains its original one-minute visibility and cleanup behavior", () => {
  assert.match(controls, /export function AdminOverviewAutoRefresh/);
  assert.match(controls, /window\.setInterval\(\(\) => \{/);
  assert.match(controls, /document\.visibilityState === "visible"\) router\.refresh\(\)/);
  assert.match(controls, /60_000/);
  assert.match(controls, /window\.clearInterval\(interval\)/);
  assert.match(controls, /return null;/);
});


test("recent activity is disclosed as consented observation rather than a live-user claim", () => {
  assert.ok(display.includes("data.visitorActivity.observedVisitorIdentities"));
  assert.ok(display.includes("Recently observed visitors (5 min)"));
  assert.ok(display.includes("not a verified count of everyone currently online"));
  assert.ok(!display.includes('hint="Currently active"'));
});

test("canonical overview reads consented recent visitor identities without overwriting account status", () => {
  const service = readFileSync("src/services/adminOverviewService.ts", "utf8");
  assert.ok(service.includes("tx.visitor.count("));
  assert.ok(service.includes('consentStatus: "GRANTED"'));
  assert.ok(service.includes("trackingDisabledAt: null"));
  assert.ok(service.includes("lastSeenAt: { gte: recentVisitorCutoff, lte: now }"));
  assert.ok(service.includes('active: userCount.get("ACTIVE")'));
});
