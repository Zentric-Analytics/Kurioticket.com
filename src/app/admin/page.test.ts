import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/admin/page.tsx", "utf8");
const dashboard = readFileSync("src/components/admin/AdminOverviewDashboard.tsx", "utf8");
const controls = readFileSync("src/components/admin/AdminOverviewControls.tsx", "utf8");
const service = readFileSync("src/services/adminOverviewService.ts", "utf8");
const providerCore = readFileSync("src/services/providerOperationalStatusCore.ts", "utf8");
const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const adminData = readFileSync("src/lib/admin-data.ts", "utf8");
const journeyCore = readFileSync("src/services/adminJourneyCore.ts", "utf8");
const display = dashboard.slice(dashboard.indexOf("export function AdminOverviewDashboard("));

function between(src: string, start: string, end: string): string {
  const first = src.indexOf(start);
  const last = src.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, "missing segment boundary: " + start);
  return src.slice(first, last);
}

test("Overview reads existing authoritative sources and never substitutes mocked totals", () => {
  assert.match(page, /getAdminOverview\(query\)/);
  assert.match(page, /getSafeSystemStatus\(\)/);
  assert.match(page, /getRecentAdminActivity\(\)/);
  assert.match(page, /No fallback or mocked operational totals are shown/);
  assert.match(page, /overview.status === "ok"/);
  assert.match(page, /<AdminOverviewDashboard/);
  assert.match(page, /<AdminOverviewSecondary system=\{system\} activity=\{activity\} \/>/);
  assert.doesNotMatch(dashboard, /Math\.random|mockData|placeholderMetrics|setInterval\(/);
  assert.match(dashboard, /<AdminOverviewAutoRefresh \/>/);
});

test("Snapshot has only four linked headline cards with genuine source expressions", () => {
  const snapshot = between(display, 'aria-label="Operations Snapshot"', 'aria-label="Attention Required"');
  const expected = [
    ['href="/admin/users" icon={Users} label="Total accounts" value={data.users.total}', "Total accounts"],
    ['href="/admin/users" icon={Activity} label="Active website users"', "Active website users"],
    ['href="/admin/searches/activity" icon={Search} label="Recorded searches" value={searches.total}', "Recorded searches"],
    ['href="/admin/journeys" icon={Route} label="Customer journeys" value={data.journeys.journeys}', "Customer journeys"],
  ];
  assert.equal((snapshot.match(/<SnapshotTile /g) ?? []).length, 4);
  for (const [code, label] of expected) assert.ok(snapshot.includes(code), label);
  assert.doesNotMatch(snapshot, /Enabled accounts|Deleted accounts|Suspended accounts/);
  assert.match(snapshot, /<AdminOverviewRangeSelect range=\{range\} \/>/);
  assert.match(snapshot, /sm:grid-cols-2 xl:grid-cols-4/);
});

test("Active Website Users is a verified 90-second consented snapshot, not enabled accounts", () => {
  const snapshot = between(display, 'aria-label="Operations Snapshot"', 'aria-label="Attention Required"');
  assert.match(snapshot, /data\.websitePresence\.status === "ok"/);
  assert.match(snapshot, /data\.websitePresence\.total : "Unavailable"/);
  assert.match(snapshot, /data\.websitePresence\.windowSeconds/);
  assert.match(snapshot, /not native app users or everyone online/);
  assert.doesNotMatch(snapshot, /data\.users\.active|data\.journeys\.identities\.registeredAccounts/);
  assert.match(service, /getWebsitePresenceSnapshot\(environment, now\)/);
  const presence = readFileSync("src/services/websitePresenceService.ts", "utf8");
  assert.match(presence, /checkedPresenceCount\(registeredAccounts \+ guestIdentities\)/);
  assert.match(presence, /if \(!row\) return unavailable\(\)/);
});

test("Attention Required displays three actionable categories, not detailed operational reports", () => {
  const attention = between(display, 'aria-label="Attention Required"', '<Panel title="Visitor Activity"');
  assert.equal((attention.match(/<AttentionLink /g) ?? []).length, 3);
  assert.match(attention, /href="\/admin\/providers"[\s\S]*?countValue=\{providerAttention\}/);
  assert.match(attention, /href="\/admin\/support"[\s\S]*?countValue=\{supportAttention\}/);
  assert.match(attention, /href="\/admin\/account-deletions"[\s\S]*?countValue=\{deletionAttention\}/);
  assert.match(display, /supportAttention = data\.support\.open \+ data\.support\.waitingOnTeam \+ data\.support\.waitingOnUser/);
  assert.match(display, /deletionAttention = data\.deletions\.pending \+ data\.deletions\.readyForReview/);
  assert.match(display, /provider\.operationalState === "DEGRADED" \|\| provider\.operationalState === "FAILING" \|\| provider\.operationalState === "NOT_READY"/);
});

test("Summary hierarchy is compact, responsive and retains agreed section order", () => {
  const sequence = [
    'aria-label="Operations Snapshot"',
    'aria-label="Attention Required"',
    '<Panel title="Visitor Activity"',
    '<Panel title="Search Performance"',
    '<Panel title="Provider Handoffs"',
    '<Panel title="Provider Health"',
    'aria-label="Operational Workloads"',
    '<Panel title="Platform Health"',
    '<Panel title="Recent Admin Activity"',
  ].map((label) => {
    const index = display.indexOf(label);
    assert.ok(index >= 0, "missing " + label);
    return index;
  });
  assert.deepEqual(sequence, [...sequence].sort((a, b) => a - b));
  assert.match(display, /grid items-start gap-3 lg:grid-cols-2/);
  assert.match(display, /gap-3 sm:grid-cols-3/);
  assert.doesNotMatch(display, /lg:grid-cols-\[0\.85fr_1\.15fr\]/);
});

test("Visitor Activity is four event-based summaries with a clear Journeys shortcut", () => {
  const visitor = between(display, '<Panel title="Visitor Activity"', '<Panel title="Search Performance"');
  assert.equal((visitor.match(/<MiniStat /g) ?? []).length, 4);
  for (const source of [
    "data.journeys.journeys",
    "funnel.SEARCH_COMPLETED.events",
    "funnel.OFFER_SELECTED.events",
    "funnel.PROVIDER_HANDOFF_STARTED.events",
  ]) assert.ok(visitor.includes(source), source);
  assert.match(visitor, /href="\/admin\/journeys"/);
  assert.match(visitor, /Consented events/);
  assert.doesNotMatch(visitor, /funnel\.SEARCH_COMPLETED\.journeys/);
});

test("Search Performance is exactly four operational counts, separate from consented journeys", () => {
  const searches = between(display, '<Panel title="Search Performance"', '<Panel title="Provider Handoffs"');
  assert.equal((searches.match(/<MiniStat /g) ?? []).length, 4);
  for (const source of ["searches.total", "searches.success", "searches.partial", "searches.failed"])
    assert.ok(searches.includes(source), source);
  assert.match(searches, /href="\/admin\/searches\/activity"/);
  assert.match(searches, /All logged searches/);
  assert.match(display, /const searches = data\.journeys\.operationalSearches/);
  assert.match(journeyCore, /"resultCount" > 0/);
  assert.match(journeyCore, /"resultCount" <= 0/);
});

test("Provider Handoffs have three truthful summary measures and a detail link", () => {
  const handoffs = between(display, '<Panel title="Provider Handoffs"', '<Panel title="Provider Health"');
  assert.equal((handoffs.match(/<MiniStat /g) ?? []).length, 3);
  assert.match(handoffs, /redirects\.total/);
  assert.match(handoffs, /redirects\.exactSearchLinks/);
  assert.match(handoffs, /redirects\.withoutVisitorIdentity/);
  assert.match(handoffs, /href="\/admin\/redirects"/);
  assert.match(handoffs, /not confirmed bookings/);
  assert.match(display, /const redirects = data\.journeys\.operationalHandoffs/);
  assert.match(journeyCore, /totalRedirects !== inConsentedJourneys \+ outsideConsentedJourneys/);
});

test("Provider Health shows only status, calls, failures and failure rate", () => {
  const card = between(dashboard, "function ProviderSummary(", "function PlatformSummary(");
  const parent = between(display, '<Panel title="Provider Health"', 'aria-label="Operational Workloads"');
  assert.match(parent, /data\.providers\.map\(\(provider\) => <ProviderSummary key=\{provider\.id\} provider=\{provider\} \/>/);
  assert.match(parent, /href="\/admin\/providers"/);
  assert.match(card, /provider\.totalCalls/);
  assert.match(card, /provider\.failedCalls/);
  assert.match(card, /formatProviderFailureRatePct\(provider\.failureRatePct, provider\.failedCalls\)/);
  assert.match(card, /provider\.readinessState === "READY" \? "Configured for calls"/);
  assert.match(card, /state === "FAILING" \? "Requests failing"/);
  assert.doesNotMatch(card, /provider\.serviceBreakdown|provider\.lastFailureAt|provider\.averageLatencyMs|provider\.failureReasons/);
  assert.match(parent, /data\.providers\.length === 0/);
  assert.match(parent, /No provider statuses reported/);
});

test("Detailed provider diagnostics remain available on the existing Providers page", () => {
  assert.match(providersPage, /provider\.serviceBreakdown\.map/);
  assert.match(providersPage, /service\.failureReasons\.map/);
  assert.match(providersPage, /provider\.lastFailureAt/);
  assert.match(providersPage, /provider\.averageLatencyMs/);
  assert.match(providersPage, /provider\.disabledCalls/);
  assert.match(providersPage, /formatProviderFailureRatePct\(provider\.failureRatePct, provider\.failedCalls\)/);
  assert.match(providerCore, /classifyProviderIssue\(row\.errorMessage\)/);
  assert.match(providerCore, /counts\.failed \* 4 >= n \* 3/);
  assert.doesNotMatch(dashboard, /errorMessage/);
});

test("Provider failure percentage retains truthful tenths and nonzero tiny failures", () => {
  assert.match(providerCore, /Math\.round\(1000 \* counts\.failed \/ n\) \/ 10/);
  assert.match(providerCore, /failedCalls > 0 && rate === 0/);
  assert.match(providerCore, /return "<0\.1%"/);
  assert.match(dashboard, /formatProviderFailureRatePct\(provider\.failureRatePct, provider\.failedCalls\)/);
});

test("Operational Workloads expose only short support and deletion summaries", () => {
  const section = between(display, 'aria-label="Operational Workloads"', '<Panel title="Platform Health"');
  assert.match(section, /href="\/admin\/support"/);
  assert.match(section, /href="\/admin\/account-deletions"/);
  for (const path of [
    "data.support.open", "data.support.waitingOnTeam", "data.support.waitingOnUser",
    "data.deletions.pending", "data.deletions.readyForReview", "data.deletions.completed",
  ]) assert.ok(section.includes(path), path);
  assert.equal((section.match(/<MiniStat /g) ?? []).length, 6);
  assert.doesNotMatch(section, /support\.resolvedOrClosed|deletions\.cancelled/);
});

test("Platform Health summaries do not misrepresent configured credentials as tested", () => {
  const platform = between(dashboard, "function PlatformSummary(", "function ActivitySummary(");
  assert.match(platform, /system\.databaseConnected/);
  assert.match(platform, /system\.authConfigured && system\.sessionConfigured/);
  assert.match(platform, /system\.emailConfigured/);
  assert.match(platform, /system\.providerCredentialsPresent/);
  assert.match(platform, /Configured, not tested/);
  assert.match(platform, /Present, not verified/);
  assert.match(display, /<Panel title="Platform Health"[\s\S]*?href="\/admin\/system"/);
  assert.match(page, /getSafeSystemStatus/);
});

test("Recent Admin Activity is three rows regardless of date range and links to Logs", () => {
  assert.match(dashboard, /activity\.items\.slice\(0, 3\)\.map/);
  assert.match(dashboard, /activity\.status === "unavailable"/);
  assert.match(dashboard, /activity\.items\.length === 0/);
  assert.match(display, /<Panel title="Recent Admin Activity"[\s\S]*?href="\/admin\/logs"/);
  assert.match(display, /human admin actions in the selected range: " \+ count\(data\.audit\.human\)/);
  assert.match(adminData, /orderBy: \{ createdAt: "desc" \}, take: limit/);
  assert.match(adminData, /source: log\.adminUserId \? "human" as const : "system" as const/);
  assert.match(adminData, /timeZone: "UTC"/);
});

test("Overview activity summaries do not reveal raw email or target details", () => {
  const activity = between(dashboard, "function ActivitySummary(", "export function AdminOverviewSecondary(");
  assert.doesNotMatch(activity, /item\.detail|item\.title\b[^\n]*font-mono|targetEmail/);
  assert.match(activity, /humanize\(item\.title\)/);
  assert.match(activity, /item\.timestamp/);
  assert.match(display, /href="\/admin\/logs"/);
});

test("Every summary destination exists and no shortcut points to a placeholder", () => {
  const destinations = [
    "/admin/users", "/admin/journeys", "/admin/searches/activity", "/admin/redirects",
    "/admin/providers", "/admin/support", "/admin/account-deletions",
    "/admin/system", "/admin/logs",
  ];
  for (const href of destinations) {
    assert.ok(dashboard.includes('href="' + href + '"'), "missing shortcut " + href);
    assert.ok(existsSync("src/app" + href + "/page.tsx"), "missing admin page " + href);
  }
  assert.match(dashboard, /function DetailsLink/);
  assert.match(dashboard, /focus-ring/);
  assert.doesNotMatch(dashboard, /href="#"/);
});

test("Overview shortens text and never hides inaccessible expanded detail panels", () => {
  assert.doesNotMatch(dashboard, /<details|<summary|className="hidden"/);
  assert.doesNotMatch(dashboard, /Full provider details|serviceBreakdown\.map|failureReasons\.map/);
  assert.doesNotMatch(dashboard, /Account status breakdown|Online website visitors|Active users \(observed\)/);
  assert.doesNotMatch(dashboard, /QuickActions|All admin modules|Admin shortcuts and modules/);
  assert.doesNotMatch(dashboard, /font-black|font-extrabold|line-clamp/);
  assert.match(dashboard, /rounded-xl border border-slate-200 bg-white p-4 sm:p-5/);
  assert.match(dashboard, /text-\[13px\] font-medium/);
});

test("The existing white parent and its unavailable-data fallback remain intact", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  const shared = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");
  assert.match(page, /title="Operations Dashboard"/);
  assert.match(page, /hideHeader/);
  assert.match(shell, /hideHeader = false/);
  assert.match(shell, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-6 lg:p-7">/);
  assert.equal((page.match(/<AdminSectionCard /g) ?? []).length, 1);
  assert.match(shared, /border-slate-200 bg-white shadow-sm/);
  assert.match(page, /Operational summary unavailable/);
  assert.match(dashboard, /export function AdminOverviewSecondary/);
  assert.match(dashboard, /<PlatformSummary system=\{system\} \/>/);
  assert.match(dashboard, /<ActivitySummary activity=\{activity\} \/>/);
});

test("Last 24 hours remains the default and chosen reporting windows are stable", () => {
  assert.match(page, /selected === "7d" \|\| selected === "30d" \? selected : "24h"/);
  assert.match(page, /const dayMs = 24 \* 60 \* 60 \* 1000/);
  assert.match(page, /range === "30d" \? 30 \* dayMs : range === "7d" \? 7 \* dayMs : dayMs/);
  assert.match(page, /query\.set\("from"/);
  assert.match(page, /query\.set\("to"/);
  assert.match(controls, /router\.push\(nextRange === "24h" \? "\/admin" : "\/admin\?range=" \+ encodeURIComponent\(nextRange\)\)/);
  assert.match(controls, /const rangeOptions: OverviewRange\[\] = \["24h", "7d", "30d"\]/);
  assert.match(display, /<AdminOverviewRangeSelect range=\{range\} \/>/);
});

test("The reporting range control remains accessible and keyboard-operable", () => {
  assert.match(controls, /role="listbox"/);
  assert.match(controls, /role="option"/);
  assert.match(controls, /aria-haspopup="listbox"/);
  assert.match(controls, /aria-selected=\{selected\}/);
  assert.match(controls, /if \(event\.key === "Escape"\)/);
  assert.match(controls, /if \(event\.key === "ArrowDown"\)/);
  assert.match(controls, /if \(event\.key === "ArrowUp"\)/);
  assert.match(controls, /event\.key === "Home"/);
  assert.match(controls, /event\.key === "End"/);
  assert.match(controls, /triggerRef\.current\?\.focus\(\)/);
  assert.doesNotMatch(controls, /<select/);
});

test("Automatic refresh retains its existing one-minute visible-tab guard", () => {
  assert.match(controls, /export function AdminOverviewAutoRefresh/);
  assert.match(controls, /window\.setInterval\(\(\) => \{/);
  assert.match(controls, /document\.visibilityState === "visible"\) router\.refresh\(\)/);
  assert.match(controls, /60_000/);
  assert.match(controls, /window\.clearInterval\(interval\)/);
  assert.match(controls, /return null;/);
});

test("Canonical backend still validates account roles and human administrative actions", () => {
  const metrics = readFileSync("src/services/adminOverviewMetrics.ts", "utf8");
  assert.match(service, /by: \["status", "role"\]/);
  assert.match(service, /summarizeAccountStatusRows\(lifecycle\.userGroups\)/);
  assert.match(service, /adminUserId: \{ not: null \}/);
  assert.match(metrics, /Unknown admin Overview workflow status/);
  assert.match(service, /summarizeWorkflowStatusRows\(/);
  assert.match(service, /supportCount\.OPEN/);
  assert.match(service, /deletionCount\.PENDING/);
  assert.match(service, /getPublicEnvironment/);
  assert.doesNotMatch(dashboard, /data\.users\.activeCustomers|data\.users\.activeAdmins/);
});

test("Canonical backend still validates environment scope, identity and handoff correlation", () => {
  assert.match(service, /journeys\.status !== "ok" \|\| !providers/);
  assert.match(service, /environment !== hostEnvironment/);
  assert.match(service, /getProviderOperationalStatuses\(24, environment\)/);
  assert.match(service, /getWebsitePresenceSnapshot\(environment, now\)/);
  assert.match(journeyCore, /operationalHandoffsSql\(query\.scope\)/);
  assert.match(journeyCore, /scopedEvents\(unfiltered\)/);
  assert.match(journeyCore, /eligible_handoff_redirects/);
  assert.match(journeyCore, /"redirectLogId" IS NOT NULL/);
  assert.match(journeyCore, /totalRedirects !== inConsentedJourneys \+ outsideConsentedJourneys/);
});

test("Required CI continues to verify metrics and consented website presence", () => {
  const workflow = readFileSync(".github/workflows/pr-required-gates.yml", "utf8");
  assert.match(workflow, /Validate Admin Overview metrics and consented presence/);
  for (const source of [
    "src/services/adminOverviewMetrics.test.ts",
    "src/lib/website-presence.test.ts",
    "src/app/admin/page.test.ts",
  ]) assert.ok(workflow.includes(source), source);
  const bridge = readFileSync("src/components/privacy/AnalyticsConsentBridge.tsx", "utf8");
  assert.match(bridge, /websitePresenceHeartbeatMs/);
  assert.match(bridge, /consentConfirmed/);
  assert.match(bridge, /visibilitychange/);
  assert.match(bridge, /controller\.abort\(\)/);
});
