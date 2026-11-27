import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("existing optional customer actions use the same consented, environment-scoped and owner-verified reader", () => {
  const reader = read("src/services/adminIdentityActivityService.ts");
  const visitor = read("src/lib/adminIdentityJourney.ts");
  const filters = read("src/lib/adminIdentityActivity.ts");
  assert.match(reader, /metadata: true/);
  assert.match(filters, /"RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED"/);
  assert.match(reader, /stages\.filter\(stage => stage !== "PROVIDER_HANDOFF_STARTED"\)/);
  assert.match(reader, /journey: \{ visitor: kind === "guest" \? eligibleGuestVisitorWhere\(id\) : eligibleJourneyLinkedVisitorWhere\(id\) \}/);
  assert.match(reader, /canonicalForVisitor/);
  assert.match(reader, /environmentScope\.journey/);
  assert.match(reader, /primaryReferenceRequired/);
  assert.match(visitor, /relatedRecordAllowed\(event\.searchHistory, event\.journey\.visitorId, kind, id\)/);
  assert.match(visitor, /if \(isHandoff \? !event\.redirectLogId : !event\.searchHistoryId\) return null/);
});

test("existing funnel metrics stay unchanged while exact per-search actions are visible", () => {
  const reader = read("src/services/adminIdentityActivityService.ts");
  const overview = read("src/components/admin/AdminActivityOverview.tsx");
  const groups = read("src/lib/adminActivityOverview.ts");
  const filters = read("src/lib/adminIdentityActivity.ts");
  for (const type of ["RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED"]) {
    assert.ok(filters.includes(type), type);
    assert.ok(groups.includes(type), type);
  }
  assert.match(reader, /const funnelEvents/);
  assert.match(reader, /events: \{ some: funnelEvents \}/);
  const activityPage = read("src/app/admin/users/[kind]/[id]/activity/page.tsx");
  const workspace = read("src/components/admin/AdminCustomerActivityWorkspace.tsx");
  assert.match(activityPage, /<AdminCustomerActivityWorkspace/);
  assert.match(activityPage, /summary=\{data\.summary\}/);
  for (const [label, field] of [["Searches", "searches"], ["Results viewed", "resultsViewed"], ["Offers selected", "offersSelected"], ["Provider handoffs", "providerHandoffs"], ["Journeys tracked", "journeysTracked"]]) {
    assert.match(workspace, new RegExp('key:\\s*"' + field + '",\\s*label:\\s*"' + label + '"'), label);
  }
  assert.match(workspace, /summary\[key\]/);
  assert.match(overview, /search\.saved/);
  assert.match(overview, /search\.unsaved/);
  assert.match(overview, /search\.shared/);
  assert.match(overview, /search\.priceAlertsCreated/);
});

test("unlinked account actions are available in Journey History without invented correlations", () => {
  const page = read("src/app/admin/users/[kind]/[id]/journeys/page.tsx");
  assert.match(page, /stage: "ACCOUNT_ACTIVITY"/);
  assert.match(page, /undefined, "all"\)/);
  assert.match(page, /!scope\.stage && !scope\.provider/);
  assert.match(page, /event => event\.stage === "ACCOUNT_ACTIVITY"/);
  assert.match(page, /Other recorded account actions/);
  assert.match(page, /<ActivityTimeline timeZone=\{timeZone\} events=\{otherActions\}/);
  assert.doesNotMatch(page, /otherActions\.map\([^)]*searchHistoryId/);
  const reader = read("src/services/adminIdentityActivityService.ts");
  assert.match(reader, /if \(typeof meta\?\.linkedJourneyId === "string" && typeof meta\?\.linkedSearchHistoryId === "string"\) return null/);
  assert.match(reader, /row => analyticsActivityRow\(row, environment\) !== null/);
});

test("the interactions tab excludes unrelated signup, support and provider-failure audits", () => {
  const reader = read("src/services/adminIdentityActivityService.ts");
  assert.match(reader, /filters\.tab === "interactions"/);
  assert.match(reader, /type: "SAVE" as const/);
  assert.match(reader, /type: "SHARE" as const/);
  assert.match(reader, /type: "ALERT_CREATED" as const/);
  assert.match(reader, /safeAnalyticsLabels/);
  assert.match(reader, /SIGNUP: "Account signup"/);
  assert.match(reader, /SUPPORT_TICKET: "Support ticket"/);
  // These other categories remain present in the broad All activity view.
  assert.match(reader, /PROVIDER_FAILURE: "Provider issue"/);
});

test("no optional client instrumentation, screenshot collection or new data capture is introduced", () => {
  const source = read("src/lib/adminIdentityJourney.ts");
  assert.match(source, /allowedActions\[event\.type\]/);
  assert.doesNotMatch(source, /JSON\.stringify\(event\.metadata\)/);
  const native = read("apps/mobile/src/features/privacy/journeyEventCoordinator.ts");
  assert.match(native, /trackingContext|contextChanged/);
  const web = read("src/components/privacy/JourneyEventsProvider.tsx");
  assert.match(web, /analyticsConsentStorageKey/);
});
