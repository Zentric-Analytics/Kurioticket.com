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

test("Overview range dropdown uses compact typography and neutral, accessible focus styling", () => {
  assert.match(controls, /px-2\.5 text-\[11px\] font-medium leading-none/);
  assert.match(controls, /px-2\.5 text-left text-\[11px\] font-medium transition-colors/);
  assert.doesNotMatch(controls, /text-\[12px\]/);
  assert.match(controls, /focus-visible:ring-1 focus-visible:ring-slate-300/);
  assert.doesNotMatch(controls, /focus-within:ring-2|focus-visible:ring-indigo-500|<select/);
  assert.match(controls, /role="listbox"/);
  assert.match(controls, /role="option"/);
  assert.match(controls, /aria-haspopup="listbox"/);
  assert.match(controls, /aria-expanded=\{open\}/);
  assert.match(controls, /aria-selected=\{selected\}/);
  assert.match(controls, /Last 24 hours/);
  assert.match(controls, /Last 7 days/);
  assert.match(controls, /Last 30 days/);
  assert.match(controls, /rounded-xl border border-slate-200 bg-white/);
  assert.match(controls, /selected \? "bg-indigo-50 text-indigo-700"/);
  assert.match(controls, /<Check size=\{14\}/);
});

test("Overview range interactions preserve navigation and accessible keyboard/close behaviors", () => {
  assert.match(controls, /router\.push\(nextRange === "7d" \? "\/admin" : "\/admin\?range=" \+ encodeURIComponent\(nextRange\)\)/);
  assert.match(controls, /if \(nextRange === range\) return/);
  assert.match(controls, /if \(event\.key === "Escape"\)/);
  assert.match(controls, /if \(event\.key === "ArrowDown"\)/);
  assert.match(controls, /if \(event\.key === "ArrowUp"\)/);
  assert.match(controls, /event\.key === "Home"/);
  assert.match(controls, /event\.key === "End"/);
  assert.match(controls, /if \(event\.key === "Tab"\) setOpen\(false\)/);
  assert.match(controls, /document\.addEventListener\("pointerdown", onPointerDown\)/);
  assert.match(controls, /document\.removeEventListener\("pointerdown", onPointerDown\)/);
  assert.match(controls, /document\.addEventListener\("focusin", onFocusIn\)/);
  assert.match(controls, /document\.removeEventListener\("focusin", onFocusIn\)/);
  assert.match(controls, /triggerRef\.current\?\.focus\(\)/);
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


test("production layout uses balanced desktop columns and keeps the activity feed full width", () => {
  assert.match(display, /grid gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(display, /lg:grid-cols-\[0\.85fr_1\.15fr\]/);
  assert.match(display, /<div className="grid gap-y-0">\s*\{data\.providers\.map/);
  assert.match(display, /sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(display, /lg:grid-cols-2/);
  assert.match(display, /<WorkloadCard title="Account Deletion Workload"[\s\S]*?<\/div>\s*<div className="mt-7">\s*<ActivityFeed activity=\{activity\} \/>/);
  assert.match(dashboard, /lg:grid-cols-\[8px_minmax\(125px,0\.75fr\)_minmax\(0,2fr\)_minmax\(150px,0\.9fr\)_minmax\(135px,1fr\)\]/);
});

test("production layout preserves original page and status backgrounds", () => {
  const shell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  const existingBackgrounds = [
    "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-indigo-400",
    "bg-slate-300", "bg-emerald-500", "bg-indigo-500",
  ];
  for (const token of existingBackgrounds) assert.ok(dashboard.includes(token), token);
  assert.doesNotMatch(dashboard, /bg-white|bg-slate-50|bg-indigo-50|bg-\[#/);
  assert.ok(shell.includes("bg-slate-100") || shell.includes("bg-[#"));
  assert.match(display, /<AdminOverviewAutoRefresh \/>/);
  assert.match(display, /<AdminOverviewRangeSelect range=\{range\} \/>/);
});

test("Overview has one Searches-style white parent surface around all sections", () => {
  const shared = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  assert.match(page, /import \{ AdminPageShell, AdminSectionCard \}/);
  assert.equal((page.match(/<AdminSectionCard /g) || []).length, 1);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-6 lg:p-7">/);
  assert.ok(page.indexOf("<AdminSectionCard") < page.indexOf("<AdminOverviewDashboard"));
  assert.ok(page.indexOf("</AdminSectionCard>") > page.indexOf("<AdminOverviewSecondary"));
  assert.match(shared, /border-slate-200 bg-white shadow-sm/);
  assert.match(display, /<AdminOverviewAutoRefresh \/>/);
  assert.match(display, /<AdminOverviewRangeSelect range=\{range\} \/>/);
});
