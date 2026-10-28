import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { compile } from "tailwindcss";

const page = readFileSync("src/app/admin/page.tsx", "utf8");
const dashboard = readFileSync("src/components/admin/AdminOverviewDashboard.tsx", "utf8");
const controls = readFileSync("src/components/admin/AdminOverviewControls.tsx", "utf8");
const service = readFileSync("src/services/adminOverviewService.ts", "utf8");
const providersPage = readFileSync("src/app/admin/providers/page.tsx", "utf8");
const core = readFileSync("src/services/providerOperationalStatusCore.ts", "utf8");
const adminData = readFileSync("src/lib/admin-data.ts", "utf8");
const display = dashboard.slice(dashboard.indexOf("export function AdminOverviewDashboard("));

function sectionSource(title: string): string {
  const start = display.indexOf('<Section title="' + title + '"');
  assert.ok(start >= 0, title + " section must exist");
  const end = display.indexOf("</Section>", start);
  assert.ok(end > start, title + " section must close");
  return display.slice(start, end + "</Section>".length);
}

test("Overview continues to use canonical authenticated, real data services", () => {
  assert.match(page, /getAdminOverview\(query\)/);
  assert.match(page, /getSafeSystemStatus\(\)/);
  assert.match(page, /getRecentAdminActivity\(\)/);
  assert.match(page, /overview\.status === "ok"/);
  assert.match(page, /No fallback or mocked operational totals are shown/);
  assert.match(page, /<AdminOverviewSecondary system=\{system\} activity=\{activity\} \/>/);
  assert.match(service, /requireAdminApiSession\(\)/);
  assert.match(service, /getPublicEnvironment\(\)/);
  assert.match(service, /environment !== hostEnvironment/);
  assert.match(service, /journeys\.status !== "ok" \|\| !providers/);
});

test("compact Operations Snapshot has exactly four genuine primary metrics", () => {
  const snapshot = display.slice(display.indexOf('aria-label="Operations Snapshot"'), display.indexOf('aria-label="Attention Required"'));
  for (const [label, value] of [
    ["Total accounts", "data.users.total"],
    ["Active website users", "websiteActive"],
    ["Recorded searches", "data.journeys.operationalSearches.total"],
    ["Customer journeys", "data.journeys.journeys"],
  ]) {
    assert.ok(snapshot.includes('label="' + label + '" value={' + value + "}"), label);
  }
  assert.equal((snapshot.match(/<SnapshotLink /g) ?? []).length, 4);
  assert.match(snapshot, /min-\[56\.25rem\]:grid-cols-4/);
  assert.match(snapshot, /sm:grid-cols-2/);
  assert.match(snapshot, /<AdminOverviewRangeSelect range=\{range\} \/>/);
  assert.doesNotMatch(snapshot, /data\.users\.(?:active|suspended|deleted)/);
  assert.doesNotMatch(snapshot, /data\.audit\.human/);
});

test("Operations Snapshot generated CSS keeps four columns above the 900px breakpoint", async () => {
  const snapshot = display.slice(display.indexOf('aria-label="Operations Snapshot"'), display.indexOf('aria-label="Attention Required"'));
  const grid = snapshot.match(/<div className="(grid gap-2 sm:grid-cols-2 [^"]+)">/);
  assert.ok(grid, "the responsive snapshot grid must exist");

  const classes = grid[1].split(/\s+/);
  assert.ok(classes.includes("min-[56.25rem]:grid-cols-4"), "use a rem breakpoint to match Tailwind's defaults");
  assert.ok(!classes.includes("min-[900px]:grid-cols-4"), "do not mix px breakpoints with rem breakpoints");

  const engine = await compile("@theme { --breakpoint-sm: 40rem; } @tailwind utilities;");
  const generatedCss = engine.build(classes);
  const twoColumnRule = generatedCss.indexOf(".sm\\:grid-cols-2");
  const fourColumnRule = generatedCss.indexOf(".min-\\[56\\.25rem\\]\\:grid-cols-4");

  assert.ok(twoColumnRule >= 0, "Tailwind must emit the two-column fallback");
  assert.ok(fourColumnRule > twoColumnRule, "Tailwind must emit the four-column rule after the fallback");
  assert.match(generatedCss.slice(fourColumnRule), /@media \(width >= 56\.25rem\)/);
});

test("compact snapshot links keep cards equal height and explanatory text readable", () => {
  const card = dashboard.slice(dashboard.indexOf("function SnapshotLink("), dashboard.indexOf("function AttentionLink("));
  assert.match(card, /flex h-full min-w-0 flex-col/);
  assert.match(card, /px-3 py-2/);
  assert.match(card, /mt-1 min-w-0 break-words/);
  assert.match(card, /mt-0\.5 min-w-0 break-words text-\[22px\]/);
  assert.match(card, /mt-1 min-w-0 break-words text-\[11px\] leading-4/);
  assert.doesNotMatch(card, /truncate|whitespace-nowrap|overflow-hidden/);
});

test("Overview shared sections and metric cards are compact without sacrificing text hierarchy", () => {
  const section = dashboard.slice(dashboard.indexOf("function Section("), dashboard.indexOf("function MiniMetric("));
  const metric = dashboard.slice(dashboard.indexOf("function MiniMetric("), dashboard.indexOf("function SnapshotLink("));
  const snapshot = dashboard.slice(dashboard.indexOf("function SnapshotLink("), dashboard.indexOf("function AttentionLink("));

  assert.match(section, /rounded-xl border border-slate-200 bg-white p-3 sm:p-4/);
  assert.match(section, /mb-2 flex flex-wrap items-center justify-between gap-2/);
  assert.match(section, /text-\[15px\] font-semibold/);
  assert.match(section, /mt-0\.5 text-xs leading-\[18px\] text-slate-600/);
  assert.match(section, /focus-ring/);
  assert.match(metric, /rounded-lg bg-slate-50\/75 px-3 py-2/);
  assert.match(metric, /min-w-0 break-words text-\[12px\] font-medium leading-4/);
  assert.match(metric, /mt-0\.5 break-words text-xl font-semibold leading-6/);
  assert.match(metric, /tabular-nums/);
  assert.doesNotMatch(metric, /truncate|overflow-hidden|whitespace-nowrap/);
  assert.match(snapshot, /px-3 py-2 transition/);
  assert.match(snapshot, /text-\[22px\] font-semibold leading-\[26px\]/);
  assert.match(display, /className="min-w-0 space-y-3"/);
  assert.match(display, /grid min-w-0 items-start gap-3 lg:grid-cols-2/);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
});

test("Four-column Platform Health and recent activity remain compact and complete", async () => {
  const platform = dashboard.slice(dashboard.indexOf("function PlatformSummary("), dashboard.indexOf("function RecentActivity("));
  const audit = dashboard.slice(dashboard.indexOf("function RecentActivity("), dashboard.indexOf("export function AdminOverviewSecondary("));

  const grid = platform.match(/className="(grid gap-2 sm:grid-cols-2 min-\[56\.25rem\]:grid-cols-4)"/);
  assert.ok(grid, "wide Overview must display four Platform Health statuses in one row");
  const engine = await compile("@theme { --breakpoint-sm: 40rem; } @tailwind utilities;");
  const generatedCss = engine.build(grid[1].split(/\s+/));
  const twoColumns = generatedCss.indexOf(".sm\\:grid-cols-2");
  const fourColumns = generatedCss.indexOf(".min-\\[56\\.25rem\\]\\:grid-cols-4");
  assert.ok(twoColumns >= 0 && fourColumns > twoColumns, "four-column platform rule must win Tailwind cascade");
  assert.match(platform, /px-3 py-2/);
  assert.match(platform, /min-w-0 break-words text-\[12px\] leading-\[18px\]/);
  assert.match(platform, /Configured, not tested/);
  assert.match(platform, /Key present, not tested/);
  assert.match(audit, /activity\.items\.slice\(0, 3\)/);
  assert.match(audit, /gap-1 py-1\.5 sm:flex-row/);
  assert.match(audit, /item\.timestamp/);
  assert.match(dashboard, /className="mt-3 grid gap-3"/);
});

test("live presence keeps consent, 90-second window, and explicit unavailable state", () => {
  assert.match(display, /data\.websitePresence\.status === "ok"/);
  assert.match(display, /data\.websitePresence\.total/);
  assert.match(display, /"Unavailable"/);
  assert.match(display, /Consented website identities · last 90s/);
  assert.match(display, /excludes native-app activity and visitors who decline analytics/);
  assert.match(display, /does not count every person online/);
  assert.match(service, /getWebsitePresenceSnapshot\(environment, now\)/);
  assert.match(readFileSync("src/components/privacy/AnalyticsConsentBridge.tsx", "utf8"), /websitePresenceHeartbeatMs/);
  assert.doesNotMatch(display, /visitorActivity\.observedVisitorIdentities/);
});

test("Attention Required remains three compact, actionable live queues", () => {
  assert.match(display, /supportAttention = data\.support\.open \+ data\.support\.waitingOnTeam \+ data\.support\.waitingOnUser/);
  assert.match(display, /deletionAttention = data\.deletions\.pending \+ data\.deletions\.readyForReview/);
  assert.match(display, /p\.operationalState === "DEGRADED"/);
  assert.match(display, /p\.operationalState === "FAILING"/);
  assert.match(display, /p\.operationalState === "NOT_READY"/);
  for (const [label, link] of [
    ["Provider issues", "/admin/providers"],
    ["Support queue", "/admin/support"],
    ["Deletion reviews", "/admin/account-deletions"],
  ]) {
    assert.ok(display.includes('href="' + link + '" label="' + label + '"'), label);
  }
  assert.equal((display.match(/<AttentionLink /g) ?? []).length, 3);
  assert.match(display, /Provider health: last 24 hours. Support and deletion queues: current/);
});

test("visitor cards display exactly four real consented action-event counts", () => {
  const visitor = sectionSource("Visitor Activity");
  for (const stage of ["SEARCH_COMPLETED", "RESULTS_VIEWED", "OFFER_SELECTED", "PROVIDER_HANDOFF_STARTED"]) {
    assert.match(visitor, new RegExp("stages\\." + stage + "\\.events"));
  }
  assert.equal((visitor.match(/<MiniMetric /g) ?? []).length, 4);
  assert.match(visitor, /Events can repeat/);
  assert.match(visitor, /Handoffs are not confirmed bookings/);
  assert.doesNotMatch(visitor, /\.journeys\}/);
  assert.match(visitor, /href="\/admin\/journeys"/);
});

test("all recorded searches are separate from consented search events", () => {
  const search = sectionSource("Search Performance");
  for (const [label, key] of [
    ["Total", "total"], ["Successful", "success"], ["Failed", "failed"], ["Partial", "partial"],
  ]) {
    assert.ok(search.includes('label="' + label + '" value={data.journeys.operationalSearches.' + key + "}"), label);
  }
  assert.equal((search.match(/<MiniMetric /g) ?? []).length, 4);
  assert.match(search, /Includes unattributed searches/);
  assert.match(search, /success does not guarantee offers/);
  assert.match(search, /href="\/admin\/searches\/activity"/);
  assert.doesNotMatch(search, /partialWithResults|partialWithoutResults/);
  assert.match(readFileSync("src/app/admin/searches/activity/page.tsx", "utf8"), /AdminPageShell/);
});

test("provider handoffs remain recorded redirects, never confirmed bookings", () => {
  const handoffs = sectionSource("Provider Handoffs");
  assert.match(handoffs, /operationalHandoffs\.total/);
  assert.match(handoffs, /operationalHandoffs\.inConsentedJourneys/);
  assert.match(handoffs, /operationalHandoffs\.withoutVisitorIdentity/);
  assert.match(handoffs, /Redirects are not bookings/);
  assert.match(handoffs, /Missing attribution does not prove declined consent/);
  assert.match(handoffs, /href="\/admin\/redirects"/);
  assert.equal((handoffs.match(/<MiniMetric /g) ?? []).length, 3);
  const contract = readFileSync("src/services/adminJourneyCore.ts", "utf8");
  assert.match(contract, /totalRedirects !== inConsentedJourneys \+ outsideConsentedJourneys/);
});

test("Overview omits duplicate Provider Health but preserves live provider issue detection", () => {
  assert.doesNotMatch(display, /<Section title="Provider Health"/);
  assert.doesNotMatch(dashboard, /function ProviderSummary\(|function StatusBadge\(|function operationalTone\(|function operationalLabel\(/);
  assert.match(display, /providerAttention = data\.providers\.filter/);
  for (const state of ["DEGRADED", "FAILING", "NOT_READY"]) {
    assert.ok(display.includes('p.operationalState === "' + state + '"'), state + " must still contribute to provider issues");
  }
  assert.match(display, /<AttentionLink href="\/admin\/providers" label="Provider issues" value=\{providerAttention\}/);
  assert.match(display, /Provider health: last 24 hours\. Support and deletion queues: current\./);
  assert.match(providersPage, /getProviderOperationalStatuses\(\)/);
  assert.match(providersPage, /provider\.serviceBreakdown\.map/);
  assert.match(providersPage, /formatProviderFailureRatePct\(provider\.failureRatePct, provider\.failedCalls\)/);
  assert.match(core, /Math\.round\(1000 \* counts\.failed \/ n\) \/ 10/);
});

test("complete provider diagnostics remain on the linked Providers page", () => {
  assert.match(providersPage, /getProviderOperationalStatuses\(\)/);
  assert.match(providersPage, /provider\.serviceBreakdown\.map/);
  assert.match(providersPage, /service\.failureReasons\.map/);
  assert.match(providersPage, /provider\.averageLatencyMs/);
  assert.match(providersPage, /provider\.lastSuccessAt/);
  assert.match(providersPage, /provider\.lastFailureAt/);
  assert.match(providersPage, /formatProviderFailureRatePct\(provider\.failureRatePct, provider\.failedCalls\)/);
  assert.doesNotMatch(dashboard, /errorMessage/);
});

test("Overview remaining cards form independently stacked columns without excess height", () => {
  const gridStart = display.indexOf('<div className="grid min-w-0 items-start gap-3 lg:grid-cols-2">');
  assert.ok(gridStart >= 0, "responsive two-column Overview must exist");
  const stack = '<div className="flex min-w-0 flex-col gap-3">';
  const leftStart = display.indexOf(stack, gridStart);
  const rightStart = display.indexOf(stack, leftStart + stack.length);
  assert.ok(leftStart > gridStart && rightStart > leftStart, "both content-height stacks must exist");

  const left = display.slice(leftStart, rightStart);
  const right = display.slice(rightStart, display.indexOf("<AdminOverviewSecondary system={system} activity={activity} />", rightStart));

  assert.match(left, /aria-label="Attention Required"/);
  assert.deepEqual([...left.matchAll(/<Section title="([^"]+)"/g)].map((match) => match[1]), [
    "Search Performance", "Support Workload",
  ]);
  assert.deepEqual([...right.matchAll(/<Section title="([^"]+)"/g)].map((match) => match[1]), [
    "Visitor Activity", "Provider Handoffs", "Deletion Workload",
  ]);
  assert.doesNotMatch(left, /h-full|flex-1|row-span|absolute/);
  assert.doesNotMatch(right, /h-full|flex-1|row-span|absolute/);
  assert.doesNotMatch(display, /<Section title="Provider Health"/);
  assert.doesNotMatch(display, /overflow-x-auto|overflow-x-scroll|whitespace-nowrap/);
});

test("Attention Required is compact and vertically stacked in its own card", () => {
  const start = display.indexOf('<section aria-label="Attention Required"');
  const end = display.indexOf("</section>", start);
  assert.ok(start >= 0 && end > start);
  const attention = display.slice(start, end);
  assert.match(attention, /<div className="grid gap-1\.5">/);
  assert.doesNotMatch(attention, /md:grid-cols-3|lg:grid-cols-3|grid-cols-3/);
  assert.equal((attention.match(/<AttentionLink /g) ?? []).length, 3);
  assert.match(attention, /Provider health: last 24 hours. Support and deletion queues: current/);

  const link = dashboard.slice(dashboard.indexOf("function AttentionLink("), dashboard.indexOf("function PlatformSummary("));
  assert.match(link, /px-3 py-2/);
  assert.match(link, /min-w-0 flex-1/);
  assert.match(link, /tabular-nums/);
});

test("operational workloads each show only three counts with dedicated destination links", () => {
  const support = sectionSource("Support Workload");
  const deletion = sectionSource("Deletion Workload");
  for (const key of ["open", "waitingOnTeam", "waitingOnUser"]) {
    assert.match(support, new RegExp("data\\.support\\." + key));
  }
  for (const key of ["pending", "readyForReview", "completed"]) {
    assert.match(deletion, new RegExp("data\\.deletions\\." + key));
  }
  assert.equal((support.match(/<MiniMetric /g) ?? []).length, 3);
  assert.equal((deletion.match(/<MiniMetric /g) ?? []).length, 3);
  assert.match(support, /href="\/admin\/support"/);
  assert.match(deletion, /href="\/admin\/account-deletions"/);
});

test("platform readiness shows four concise indicators without claiming auth or email works", () => {
  const health = dashboard.slice(dashboard.indexOf("function PlatformSummary("), dashboard.indexOf("function RecentActivity("));
  for (const field of ["system.databaseConnected", "system.databaseConfigured", "system.authConfigured", "system.sessionConfigured", "system.emailConfigured", "system.providerCredentialsPresent"]) {
    assert.ok(health.includes(field), field);
  }
  assert.match(health, /Configured, not tested/);
  assert.match(health, /Key present, not tested/);
  assert.match(health, /Not connected/);
  assert.match(health, /items\.map/);
  assert.match(dashboard, /<Section title="Platform Health" href="\/admin\/system"/);
});

test("audit summary limits display to three latest actions, retaining full records in Logs", () => {
  const audit = dashboard.slice(dashboard.indexOf("function RecentActivity("), dashboard.indexOf("export function AdminOverviewSecondary("));
  assert.match(audit, /activity\.items\.slice\(0, 3\)/);
  assert.match(audit, /humanize\(item\.title\)/);
  assert.match(audit, /item\.detail/);
  assert.match(audit, /item\.timestamp/);
  assert.match(audit, /activity\.status === "unavailable"/);
  assert.match(audit, /recent\.length === 0/);
  assert.match(dashboard, /Latest three actions across all dates/);
  assert.match(dashboard, /href="\/admin\/logs"/);
  assert.match(adminData, /take: limit/);
  assert.match(adminData, /timeZone: "UTC"/);
});

test("all summary destinations have actual administrator pages", () => {
  const destinations = [
    "/admin/users",
    "/admin/searches/activity",
    "/admin/journeys",
    "/admin/redirects",
    "/admin/providers",
    "/admin/support",
    "/admin/account-deletions",
    "/admin/system",
    "/admin/logs",
  ];
  for (const href of destinations) {
    assert.ok(existsSync("src/app" + href + "/page.tsx"), href + " destination must exist");
    assert.ok(dashboard.includes('href="' + href + '"'), href + " must be linked from Overview");
  }
  assert.match(dashboard, /aria-label=\{"View " \+ title \+ " details"\}/);
  assert.match(dashboard, /focus-ring/);
});

test("no fake totals, old full-report panels, or hidden full diagnostics remain on Overview", () => {
  assert.doesNotMatch(dashboard, /Full provider details|<FunnelStep|<DetailRow|<WorkloadCard|<ActivityFeed/);
  assert.doesNotMatch(dashboard, /provider\.serviceBreakdown\.map|service\.failureReasons\.map/);
  assert.doesNotMatch(dashboard, /AdminSectionCard|AdminEmptyState|<Card/);
  assert.doesNotMatch(dashboard, /<details|display:\s*none|hidden\s+aria-label/);
  assert.doesNotMatch(dashboard, /QuickActions|All admin modules|Admin shortcuts and modules/);
  assert.doesNotMatch(page, /adminNavigation\.filter|modules=\{modules\}/);
  assert.match(page, /<AdminOverviewSecondary system=\{system\} activity=\{activity\} \/>/);
});

test("the compact grid remains responsive without horizontal scrolling or cramped desktop cards", () => {
  assert.match(display, /grid gap-2 sm:grid-cols-2 min-\[56\.25rem\]:grid-cols-4/);
  assert.match(display, /<div className="grid gap-1\.5">/);
  assert.match(display, /grid min-w-0 items-start gap-3 lg:grid-cols-2/);
  assert.match(dashboard, /grid grid-cols-2 gap-1\.5/);
  assert.match(dashboard, /grid grid-cols-3 gap-1\.5/);
  assert.match(dashboard, /flex flex-wrap items-center justify-between gap-2/);
  assert.doesNotMatch(dashboard, /overflow-x-auto|overflow-x-scroll|whitespace-nowrap/);
});

test("the white parent container, original admin header, and automatic refresh remain", () => {
  const shell = readFileSync("src/components/admin/AdminPageShellHistorical.tsx", "utf8");
  const horizontalShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
  assert.match(page, /title="Operations Dashboard"/);
  assert.match(page, /hideHeader/);
  assert.match(shell, /hideHeader = false/);
  assert.match(shell, /<h1 className="sr-only">\{title\}<\/h1>/);
  assert.match(page, /<AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">/);
  assert.equal((page.match(/<AdminSectionCard /g) ?? []).length, 1);
  assert.match(horizontalShell, /bg-\[#f1f5fb\]/);
  assert.match(display, /<AdminOverviewAutoRefresh \/>/);
  assert.match(controls, /window\.setInterval\(\(\) => \{/);
  assert.match(controls, /document\.visibilityState === "visible"\) router\.refresh\(\)/);
  assert.match(controls, /60_000/);
  assert.match(controls, /window\.clearInterval\(interval\)/);
});

test("the 24-hour default and other historical range selections remain intact", () => {
  assert.match(page, /selected === "7d" \|\| selected === "30d" \? selected : "24h"/);
  assert.match(page, /range === "30d" \? 30 \* dayMs : range === "7d" \? 7 \* dayMs : dayMs/);
  assert.match(page, /query\.set\("from"/);
  assert.match(page, /query\.set\("to"/);
  assert.match(controls, /const rangeOptions: OverviewRange\[\] = \["24h", "7d", "30d"\]/);
  assert.match(controls, /router\.push\(nextRange === "24h" \? "\/admin" : "\/admin\?range=" \+ encodeURIComponent\(nextRange\)\)/);
  assert.match(controls, /role="listbox"/);
  assert.match(controls, /aria-haspopup="listbox"/);
  assert.match(controls, /aria-expanded=\{open\}/);
  assert.match(service, /getProviderOperationalStatuses\(24, environment\)/);
  assert.match(service, /getWebsitePresenceSnapshot\(environment, now\)/);
});

test("backend metrics retain strict account, audit, queue and environment validation", () => {
  assert.match(service, /by: \["status", "role"\]/);
  assert.match(service, /adminUserId: \{ not: null \}/);
  assert.match(service, /summarizeAccountStatusRows\(lifecycle.userGroups\)/);
  assert.match(service, /summarizeWorkflowStatusRows\(/);
  assert.match(service, /supportCount\.OPEN/);
  assert.match(service, /deletionCount\.PENDING/);
  assert.match(service, /getPublicEnvironment/);
  assert.match(adminData, /source: log\.adminUserId \? "human" as const : "system" as const/);
  const journeyCore = readFileSync("src/services/adminJourneyCore.ts", "utf8");
  assert.match(journeyCore, /totalRedirects !== inConsentedJourneys \+ outsideConsentedJourneys/);
  assert.match(journeyCore, /"resultCount" > 0/);
  assert.match(journeyCore, /"resultCount" <= 0/);
});

test("the required CI gate still validates overview integrity and consented presence", () => {
  const workflow = readFileSync(".github/workflows/pr-required-gates.yml", "utf8");
  const metrics = readFileSync("src/services/adminOverviewMetrics.ts", "utf8");
  const presence = readFileSync("src/services/websitePresenceService.ts", "utf8");
  assert.match(workflow, /Validate Admin Overview metrics and consented presence/);
  for (const path of ["src/services/adminOverviewMetrics.test.ts", "src/lib/website-presence.test.ts", "src/app/admin/page.test.ts"]) {
    assert.ok(workflow.includes(path), path);
  }
  assert.match(metrics, /Unknown admin Overview workflow status/);
  assert.match(presence, /if \(!row\) return unavailable\(\)/);
  assert.match(presence, /checkedPresenceCount\(registeredAccounts \+ guestIdentities\)/);
});
