import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/admin/users/[kind]/[id]/activity/page.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/admin/AdminCustomerActivityWorkspace.tsx", import.meta.url), "utf8");
const fullWorkspace = readFileSync(new URL("../components/admin/AdminFullActivityWorkspace.tsx", import.meta.url), "utf8");
const live = readFileSync(new URL("../components/admin/AdminLiveGuestActivity.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../components/admin/ActivityTimeline.tsx", import.meta.url), "utf8");
const unified = readFileSync(new URL("../components/admin/AdminUnifiedActivityList.tsx", import.meta.url), "utf8");
const allActivity = readFileSync(new URL("../app/admin/users/[kind]/[id]/activity/all/page.tsx", import.meta.url), "utf8");
const reader = readFileSync(new URL("../services/adminIdentityActivityService.ts", import.meta.url), "utf8");
const filters = readFileSync(new URL("./adminIdentityActivity.ts", import.meta.url), "utf8");
const dateQuery = readFileSync(new URL("./adminActivityDateQuery.ts", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/admin/AdminHorizontalShell.tsx", import.meta.url), "utf8");

test("Activity Explorer distinguishes consented visitors and operational guests without inventing identity", () => {
  assert.match(page, /operational \? "Guest session" : "Visitor"/);
  assert.match(page, /data\.source === "operational"/);
  assert.match(page, /Essential operational activity/);
  assert.match(page, /Consented guest/);
  // Privacy and environment scoping are enforced in the reader, not by a tooltip.
  assert.doesNotMatch(page, /ActivityDataInfo|Only recorded, necessary|Only recorded, consented/);
  assert.doesNotMatch(page, /Guest · Not an account|Unregistered visitor with active analytics consent/);
  assert.match(timeline, /No activity recorded in this view/);
  assert.match(timeline, /No activity matches your filters/);
  assert.doesNotMatch(page, /Missing records do not establish that no visit occurred/);
});

test("the activity reader never includes cross-environment or unowned history in an identity timeline", () => {
  assert.match(reader, /const environment = getPublicEnvironment\(\)/);
  assert.match(reader, /const environmentScope = activityEnvironmentScope\(environment\)/);
  assert.match(reader, /searchOwner, environmentScope\.search/);
  assert.match(reader, /redirectOwner, environmentScope\.handoff/);
  assert.match(reader, /analyticsOwner, environmentScope\.analytics/);
  assert.match(reader, /scopedJourneyOwner/);
  assert.match(filters, /metadata: \{ path: \["environment"\], equals: environment \}/);
  assert.match(filters, /query: \{ path: \["environment"\], equals: environment \}/);
});

test("Activity summary counts filter-wide records instead of paginated timeline rows", () => {
  assert.match(reader, /tx\.journeyEvent\.groupBy\(/);
  assert.match(reader, /tx\.searchHistory\.count\(\{ where: searchWhere \}\)/);
  assert.match(reader, /tx\.redirectLog\.count\(\{ where: handoffWhere \}\)/);
  assert.match(reader, /tx\.searchJourney\.count\(/);
  assert.match(reader, /events: \{ some: funnelEvents \}/);
  assert.match(reader, /AND: \[validEvents, \{ type: \{ in: \[/);
  assert.match(reader, /Prisma\.TransactionIsolationLevel\.RepeatableRead/);
  assert.match(reader, /canonicalForVisitor\(visitorId\)/);
  assert.match(reader, /visitorIds\.map\(visitorId => canonicalForVisitor\(visitorId\)\)/);
  assert.match(reader, /const summary: IdentityActivitySummary/);
  assert.match(workspace, /summary\?\.searches/);
  assert.match(workspace, /summary\?\.resultsViewed/);
  assert.match(workspace, /summary\?\.offersSelected/);
  assert.match(workspace, /summary\?\.providerHandoffs/);
  assert.match(workspace, /summary\?\.journeysTracked/);
  assert.match(page, /summary=\{data\.summary\}/);
  assert.doesNotMatch(page, /Counts reflect loaded events only\./);
});

test("Activity and Support use white non-Overview workspaces while preserving authorization boundaries", () => {
  assert.match(shell, /const whiteWorkspace = userActivity \|\| pathname === "\/admin\/platform-health"/);
  assert.match(shell, /homepageFaresWorkspace \|\| !isOverview;/);
  assert.match(shell, /const isOverview = pathname === "\/admin" \|\| pathname === "\/admin\/"/);
  assert.match(shell, /const supportWorkspace = pathname === "\/admin\/support" \|\| pathname\.startsWith\("\/admin\/support\/"\)/);
  assert.match(shell, /const providersWorkspace = pathname === "\/admin\/providers"/);
  assert.match(shell, /const providerReportingWorkspace = pathname === "\/admin\/referral-attribution"/);
  assert.match(shell, /const accountDeletionWorkspace = pathname === "\/admin\/account-deletions"/);
  assert.match(shell, /const accountDeletionDetail = accountDeletionParts\.length === 3/);
  assert.match(shell, /accountDeletionParts\[1\] === "account-deletions"/);
  assert.match(shell, /const visitorJourneysWorkspace = pathname === "\/admin\/journeys" \|\| pathname\.startsWith\("\/admin\/journeys\/"\)/);
  assert.match(shell, /const whiteWorkspace = .*usersDirectory \|\| visitorJourneysWorkspace \|\| searchesWorkspace \|\| supportWorkspace\s+\|\| providersWorkspace \|\| providerReportingWorkspace \|\| hotelCarsWorkspace \|\| accountDeletionWorkspace \|\| accountDeletionDetail \|\| contentWorkspace \|\| notificationsWorkspace \|\| homepageFaresWorkspace \|\| !isOverview;/);
  assert.match(shell, /const hotelCarsWorkspace = pathname === "\/admin\/hotels" \|\| pathname === "\/admin\/hotels\/" \|\| pathname === "\/admin\/cars" \|\| pathname === "\/admin\/cars\/";/);
  assert.match(shell, /whiteWorkspace \? "bg-white" : "bg-\[#f1f5fb\]"/);
  assert.match(workspace, /space-y-6 bg-white/);
  assert.match(workspace, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(workspace, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(workspace, /text-\[12px\] font-normal text-\[#64748B\]/);
  assert.match(page, /<AdminUnifiedActivityList/);
  assert.match(unified, /data-testid="unified-activity-list"/);
  assert.match(allActivity, /await requireAdminSession\(path\)/);
  assert.match(allActivity, /loadAdminUnifiedActivity\(kind,id,filters,cursor,now\)/);
  assert.match(page, /normalizeUserActivityQuery\(await searchParams, now, timeZone\)/);
  assert.match(dateQuery, /if \(raw\.tab === "journeys"\) delete raw\.tab/);
  assert.doesNotMatch(page, /Related records|const related =|label="Journeys"|value: "journeys"/);
  assert.doesNotMatch(timeline, /Show all|Hide all|Not linked to a journey/);
});

test("User Activity keeps one shared identity, six metrics and compact activity list in order", () => {
  const breadcrumb = workspace.indexOf('<nav aria-label="Breadcrumb"');
  const mainCard = workspace.indexOf('data-testid="activity-page-card"');
  const identity = workspace.indexOf('aria-label="Customer identity"');
  const summary = workspace.indexOf('aria-label="Activity summary"');
  const history = workspace.indexOf('{children}',summary);
  assert.ok(breadcrumb !== -1 && breadcrumb < mainCard);
  assert.ok(mainCard < identity && identity < summary && summary < history);
  assert.equal((workspace.match(/data-testid="activity-page-card"/g) ?? []).length,1);
  assert.equal((page.match(/<AdminUnifiedActivityList/g) ?? []).length,1);
  assert.match(page, /<AdminCustomerActivityWorkspace/);
  assert.match(live, /<AdminCustomerActivityWorkspace/);
  assert.doesNotMatch(page, /<ActivityTimeline|<AdminIdentityDeviceAccess|<PageViewRecords|<ActivityFiltersBar/);
  assert.match(workspace.slice(mainCard,identity), /rounded-2xl border border-\[#E2E8F0\] bg-white/);
  assert.match(workspace.slice(identity,summary), /data-testid="activity-identity-dividers"/);
  const metrics = workspace.slice(summary,workspace.indexOf("</section>",summary));
  assert.doesNotMatch(metrics, /bg-(?:blue|sky|emerald|amber|\[#)/);
  for (const metric of ["searches","resultsViewed","offersSelected","providerHandoffs","journeysTracked","pagesVisited"]) {
    assert.ok(metrics.includes("summary?."+metric) || metrics.includes("summary."+metric),metric);
  }
  assert.match(metrics,/xl:grid-cols-6/);
  assert.match(metrics,/xl:border-l/);
  assert.doesNotMatch(metrics,/activity-divider-|<h2/);
  assert.match(unified,/View all activity/);
  assert.match(allActivity,/<AdminFullActivityWorkspace/);
  assert.match(live,/<AdminFullActivityWorkspace/);
  assert.match(fullWorkspace,/<ActivityFiltersBar/);
  assert.match(fullWorkspace,/aria-label="Activity categories"/);
  assert.doesNotMatch(live,/aria-label="Activity categories"/);
  assert.match(allActivity,/<AdminUnifiedActivityList/);
});

test("live reference validates current presence before resolving recorded ownership and retains admin and environment checks",()=>{
  for(const route of [page,allActivity]){
    assert.ok(route.indexOf('if (kind === "live-guest")') < route.indexOf("if (!validActivityIdentity(kind"));
    assert.match(route,/<AdminLiveGuestActivity reference=\{id\}/);
    assert.match(route,/input=\{await searchParams\}/);
    assert.match(route,/export const dynamic = "force-dynamic"/);
  }
  assert.match(live,/await requireAdminSession\("\/admin\/users"\)/);
  assert.match(live,/safeReference && environment === "staging"/);
  assert.match(live,/const now = new Date\(\)/);
  assert.match(live,/resolveLiveGuestActivity\(snapshot, reference, now\)/);
  assert.match(live,/const history = row \? await resolveAdminLiveGuestHistory\(row, environment, now\) : null/);
  const authentication = live.indexOf('await requireAdminSession("/admin/users")');
  const currentPresence = live.indexOf("const row = resolveLiveGuestActivity");
  const historyResolver = live.indexOf("const history = row ? await resolveAdminLiveGuestHistory");
  const canonicalRedirect = live.indexOf("if (recordedHref) redirect(recordedHref)");
  assert.ok(authentication < currentPresence && currentPresence < historyResolver && historyResolver < canonicalRedirect);
  assert.match(live,/history \? recordedGuestActivityHref\(history\.id, full, input\) : null/);
  assert.doesNotMatch(live,/recordedGuestActivityHref\(row\./);
  assert.match(live,/eventCount=\{null\} summary=\{null\}/);
  assert.match(live,/allHref=\{path \+ "\/all"\}/);
  assert.doesNotMatch(live,/loadAdminIdentityActivity|loadAdminUnifiedActivity|loadAdminGuestAccessHistory|CopyIdentityId|GuestTrackingActions/);
  assert.match(workspace,/aria-label="Unavailable"/);
});
