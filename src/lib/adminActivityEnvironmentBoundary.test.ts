import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/admin/users/[kind]/[id]/activity/page.tsx", import.meta.url), "utf8");
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
  assert.match(page, /data\.summary\.searches/);
  assert.match(page, /data\.summary\.resultsViewed/);
  assert.match(page, /data\.summary\.offersSelected/);
  assert.match(page, /data\.summary\.providerHandoffs/);
  assert.match(page, /data\.summary\.journeysTracked/);
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
  assert.match(page, /space-y-6 bg-white/);
  assert.match(page, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(page, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(page, /text-\[12px\] font-normal text-\[#64748B\]/);
  assert.match(page, /<AdminUnifiedActivityList/);
  assert.match(unified, /data-testid="unified-activity-list"/);
  assert.match(allActivity, /await requireAdminSession\(path\)/);
  assert.match(allActivity, /loadAdminUnifiedActivity\(kind,id,filters,cursor,now\)/);
  assert.match(page, /normalizeUserActivityQuery\(await searchParams, now, timeZone\)/);
  assert.match(dateQuery, /if \(raw\.tab === "journeys"\) delete raw\.tab/);
  assert.doesNotMatch(page, /Related records|const related =|label="Journeys"|value: "journeys"/);
  assert.doesNotMatch(timeline, /Show all|Hide all|Not linked to a journey/);
});

test("User Activity keeps identity, six metrics and one compact activity list in order", () => {
  const breadcrumb = page.indexOf('<nav aria-label="Breadcrumb"');
  const mainCard = page.indexOf('data-testid="activity-page-card"');
  const identity = page.indexOf('aria-label="Customer identity"');
  const summary = page.indexOf('aria-label="Activity summary"');
  const history = page.indexOf('<AdminUnifiedActivityList');
  assert.ok(breadcrumb !== -1 && breadcrumb < mainCard, "breadcrumb stays outside the page card");
  assert.ok(mainCard < identity && identity < summary && summary < history);
  assert.equal((page.match(/data-testid="activity-page-card"/g) ?? []).length, 1);
  assert.equal((page.match(/<AdminUnifiedActivityList/g) ?? []).length, 1);
  assert.doesNotMatch(page, /<ActivityTimeline|<AdminIdentityDeviceAccess|<PageViewRecords|<ActivityFiltersBar/);
  assert.match(page.slice(mainCard, identity), /rounded-2xl border border-\[#E2E8F0\] bg-white/);
  const identityMarkup = page.slice(identity, summary);
  assert.match(identityMarkup, /data-testid="activity-identity-dividers"/);
  const summaryMarkup = page.slice(summary, page.indexOf("</section>", summary));
  assert.doesNotMatch(summaryMarkup, /bg-(?:blue|sky|emerald|amber|\[#)/);
  for (const metric of ["searches", "resultsViewed", "offersSelected", "providerHandoffs", "journeysTracked", "pagesVisited"]) {
    assert.ok(summaryMarkup.includes("data.summary." + metric), metric);
  }
  assert.match(summaryMarkup, /xl:grid-cols-6/);
  assert.match(summaryMarkup, /xl:border-l/);
  assert.doesNotMatch(summaryMarkup, /activity-divider-|<h2/);
  assert.match(unified, /View all activity/);
  assert.match(allActivity, /<ActivityFiltersBar/);
  assert.match(allActivity, /<AdminUnifiedActivityList/);
});
