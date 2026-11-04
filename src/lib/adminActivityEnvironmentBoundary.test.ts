import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/admin/users/[kind]/[id]/activity/page.tsx", import.meta.url), "utf8");
const timeline = readFileSync(new URL("../components/admin/ActivityTimeline.tsx", import.meta.url), "utf8");
const reader = readFileSync(new URL("../services/adminIdentityActivityService.ts", import.meta.url), "utf8");
const filters = readFileSync(new URL("./adminIdentityActivity.ts", import.meta.url), "utf8");
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
  assert.match(reader, /events: \{ some: validEvents \}/);
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

test("Activity preserves its approved colors while Support joins the white Searches workspace", () => {
  assert.match(shell, /userActivity \? "bg-\[#f1f5fb\]"/);
  assert.match(shell, /const supportWorkspace = pathname === "\/admin\/support" \|\| pathname\.startsWith\("\/admin\/support\/"\)/);
  assert.match(shell, /const providersWorkspace = pathname === "\/admin\/providers"/);
  assert.match(shell, /const providerReportingWorkspace = pathname === "\/admin\/referral-attribution"/);
  assert.match(shell, /const accountDeletionDetail = accountDeletionParts\.length === 3/);
  assert.match(shell, /accountDeletionParts\[1\] === "account-deletions"/);
  assert.match(shell, /const whiteWorkspace = .*usersDirectory \|\| searchesWorkspace \|\| supportWorkspace\s+\|\| providersWorkspace \|\| providerReportingWorkspace \|\| accountDeletionDetail \|\| contentWorkspace;/);
  assert.match(shell, /whiteWorkspace \? "bg-white" : "bg-\[#f1f5fb\]"/);
  assert.match(page, /space-y-6 bg-\[#F1F5FB\]/);
  assert.match(page, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(page, /text-\[16px\] font-medium leading-6 tabular-nums text-\[#0F172A\]/);
  assert.match(page, /text-\[12px\] font-normal text-\[#64748B\]/);
  assert.match(page, /data-testid="activity-body-card"/);
  assert.match(page, /if \(raw\.tab === "journeys"\) delete raw\.tab/);
  assert.doesNotMatch(page, /Related records|const related =|label="Journeys"|value: "journeys"/);
  assert.doesNotMatch(timeline, /Show all|Hide all|Not linked to a journey/);
});

test("User Activity renders exactly two nested white workspace cards with a flat summary", () => {
  const breadcrumb = page.indexOf('<nav aria-label="Breadcrumb"');
  const mainCard = page.indexOf('data-testid="activity-page-card"');
  const identity = page.indexOf('aria-label="Customer identity"');
  const summary = page.indexOf('aria-label="Activity summary"');
  const body = page.indexOf('data-testid="activity-body-card"');
  const history = page.indexOf('<ActivityTimeline');
  assert.ok(breadcrumb !== -1 && breadcrumb < mainCard, "breadcrumb stays outside the page card");
  assert.ok(mainCard < identity && identity < summary && summary < body && body < history,
    "identity, flat summary and activity body stay in order inside the main card");
  assert.equal((page.match(/data-testid="activity-page-card"/g) ?? []).length, 1);
  assert.equal((page.match(/data-testid="activity-body-card"/g) ?? []).length, 1);
  const mainCardMarkup = page.slice(mainCard, identity);
  assert.match(mainCardMarkup, /rounded-2xl border border-\[#E2E8F0\] bg-white/);
  const summaryMarkup = page.slice(summary, body);
  assert.doesNotMatch(summaryMarkup, /bg-(?:blue|sky|emerald|amber|\[#)/,
    "Activity summary uses no colored background or metric dots");
  assert.match(summaryMarkup, /data\.summary\.searches/);
  assert.match(summaryMarkup, /data\.summary\.resultsViewed/);
  assert.match(summaryMarkup, /data\.summary\.offersSelected/);
  assert.match(summaryMarkup, /data\.summary\.providerHandoffs/);
  assert.match(summaryMarkup, /data\.summary\.journeysTracked/);
  assert.match(summaryMarkup, /lg:grid-cols-5/);
  assert.doesNotMatch(summaryMarkup, /<h2/, "the five metrics replace the visible summary heading");
});
