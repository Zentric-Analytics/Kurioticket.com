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

test("Journey History links unlinked account actions to the same identity's complete history without invented correlations", () => {
  const page = read("src/app/admin/users/[kind]/[id]/journeys/page.tsx");
  const actionLink = page.match(/const accountActivityHref = activityHref\([\s\S]*?\n  \}\);/)?.[0];
  assert.ok(actionLink, "Journey history keeps a scoped link to the separate action history");
  assert.match(page, /const route = "\/admin\/users\/" \+ kind \+ "\/" \+ encodeURIComponent\(id\)/);
  assert.match(actionLink, /activityHref\(route \+ "\/activity\/all", backContext/);
  assert.match(page, /const accountActivityRange = requested\.range === "90d" \? "custom" : requested\.range/);
  assert.match(actionLink, /range: accountActivityRange/);
  assert.match(actionLink, /from: accountActivityRange === "custom" \? scope\.from : null/);
  assert.match(actionLink, /to: accountActivityRange === "custom" \? scope\.to : null/);
  assert.match(actionLink, /tab: "all", stage: "ACCOUNT_ACTIVITY", product: scope\.product \?\? null/);
  assert.match(actionLink, /interface: null/, "The dedicated account-activity link clears any Admin interface filter");
  assert.match(actionLink, /q: null, cursor: null, order: null/);
  assert.match(page, /<Link href=\{accountActivityHref\}[^>]*>\{accountActivityLabel\}/);
  assert.equal((page.match(/\bloadAdminIdentityActivity\(/g) ?? []).length, 1,
    "Journey history does not load a second complete account-action feed");
  const identityRead = page.match(/const identity = await loadAdminIdentityActivity\([\s\S]*?\n  \);/)?.[0];
  assert.ok(identityRead, "The selected identity is still verified by the activity reader");
  assert.match(identityRead, /kind, id, activityFilters, one\(raw\.activityCursor\) \|\| undefined, "page",/);
  assert.doesNotMatch(page, /Other recorded account actions|events=\{otherActions\}/);
  assert.doesNotMatch(page, /otherActions\.map\([^)]*searchHistoryId/);
  const reader = read("src/services/adminIdentityActivityService.ts");
  const accountProjection = reader.match(/function analyticsActivityRow\([\s\S]*?\n\}/)?.[0];
  assert.ok(accountProjection, "The complete history retains the separate account-action classification");
  assert.match(accountProjection, /id: "e-" \+ event\.id/);
  assert.match(accountProjection, /stage: isPackageSubmission \? "PACKAGE_SEARCH_SUBMITTED" : "ACCOUNT_ACTIVITY"/);
  assert.doesNotMatch(accountProjection, /\b(?:journeyId|searchHistoryId)\s*:/,
    "An unlinked account action cannot acquire an invented journey or search reference");
  // adminIdentityActivityComplete.test.ts covers exact replacement, Essential
  // retention and unchanged optional/legacy suppression; admin-journey.integration.ts
  // verifies the reader against PostgreSQL.
  assert.match(reader, /row => analyticsActivityRow\(row, environment\) !== null/);
});

test("optional client instrumentation requires confirmed context and keeps screenshot data outside history", () => {
  const source = read("src/lib/adminIdentityJourney.ts");
  assert.match(source, /allowedActions\[event\.type\]/);
  assert.doesNotMatch(source, /JSON\.stringify\(event\.metadata\)/);
  const native = read("apps/mobile/src/features/privacy/journeyEventCoordinator.ts");
  assert.match(native, /this\.contextChanged\(\)/);
  assert.match(native, /pending\.controller\.abort\(\)/);
  assert.match(native, /this\.context === null \|\| !validRequestId\(requestId\)/);
  const web = read("src/components/privacy/JourneyEventsProvider.tsx");
  assert.match(web, /allowed: \(\) => getConfirmedBrowserAnalyticsSignal\(\) !== null/);
  assert.match(web, /isAnalyticsConsentStorageEvent\(event\)/);
  assert.match(web, /if \(event && signal\) deliverCustomerActivity\("\/api\/activity\/page-views", event, signal\)/);
  const consent = read("src/lib/analyticsConsentClient.ts");
  assert.match(consent, /parseAnalyticsConsent\(window\.localStorage\.getItem\(analyticsConsentStorageKey\)\) === "granted"/);
  assert.doesNotMatch(web + native, /getDisplayMedia|getUserMedia|takeScreenshot|captureScreen|html2canvas/);
});
