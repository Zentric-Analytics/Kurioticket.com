import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminOverviewPage = readFileSync("src/app/admin/page.tsx", "utf8");

function blockBetween(start: string, end: string): string {
  const startIndex = adminOverviewPage.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} should exist`);
  const endIndex = adminOverviewPage.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} should exist after ${start}`);

  return adminOverviewPage.slice(startIndex, endIndex);
}

function labelsFor(component: string, block = adminOverviewPage): string[] {
  return Array.from(block.matchAll(new RegExp(`<${component} label="([^"]+)"`, "g")), (match) => match[1]);
}

test("admin home header replaces operations dashboard without the admin operations eyebrow", () => {
  assert.match(adminOverviewPage, /title="Admin Home"/);
  assert.match(adminOverviewPage, /Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions\./);
  assert.doesNotMatch(adminOverviewPage, /Operations Dashboard/);
  assert.doesNotMatch(adminOverviewPage, /ADMIN OPERATIONS/i);
  assert.match(adminOverviewPage, /eyebrow=""/);
});

test("admin home sections appear in the required operational order", () => {
  const sectionOrder = ["Needs Attention", "At a Glance", "Search Activity", "Service Status", "Recent Admin Activity"];
  const indexes = sectionOrder.map((heading) => adminOverviewPage.indexOf(heading));

  indexes.forEach((index, position) => assert.notEqual(index, -1, `${sectionOrder[position]} should exist`));
  assert.deepEqual([...indexes].sort((a, b) => a - b), indexes);
});

test("needs attention derives rows only from provider, system, and search health data", () => {
  const attentionLogic = blockBetween("function getAttentionIssues", "function providerReadinessLabel");

  assert.match(adminOverviewPage, /const attentionIssues = getAttentionIssues\(providers, system, searchHealth\)/);
  assert.match(attentionLogic, /provider\.providerName === "Not connected"/);
  assert.match(attentionLogic, /!provider\.credentialsPresent/);
  assert.match(attentionLogic, /!provider\.searchEnabled/);
  assert.match(attentionLogic, /!system\.databaseConnected/);
  assert.match(attentionLogic, /!\(system\.authConfigured && system\.sessionConfigured\)/);
  assert.match(attentionLogic, /!system\.emailConfigured/);
  assert.match(attentionLogic, /!system\.webhookConfigured/);
  assert.match(attentionLogic, /Number\(searchHealth\.failedSearches\) > 0/);
  assert.match(attentionLogic, /Number\(searchHealth\.noResultSearches\) > 0/);
  assert.match(adminOverviewPage, /No urgent issues require attention\./);
});

test("at a glance preserves all six metrics in order and a one, two, then three column grid", () => {
  const glanceBlock = blockBetween("At a Glance", "Search Activity");

  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), [
    "Total users",
    "Active users",
    "Suspended users",
    "Admin users",
    "Recent searches",
    "Recent admin actions",
  ]);
  assert.match(glanceBlock, /grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/);
  assert.doesNotMatch(glanceBlock, /xl:grid-cols-6|grid-cols-6/);
  assert.match(glanceBlock, /hint="Last 7 days"/);
});

test("provider readiness large-card section is absent but providers remain represented in service status", () => {
  assert.doesNotMatch(adminOverviewPage, /<SectionHeading[^>]*>Provider Readiness<\/SectionHeading>|AdminProviderStatusCard|Operations Snapshot/);

  const serviceBlock = blockBetween("Service Status", "Recent Admin Activity");
  assert.match(serviceBlock, /providers\.map/);
  assert.match(serviceBlock, /provider\.product/);
  const adminData = readFileSync("src/lib/admin-data.ts", "utf8");
  assert.match(adminData, /product: "Flights"/);
  assert.match(adminData, /product: "Hotels"/);
  assert.match(adminData, /product: "Cars"/);
});

test("search activity uses flat metrics and does not nest AdminMetricCard inside AdminSectionCard", () => {
  const searchBlock = blockBetween("<SectionHeading id=\"search-activity-heading\">Search Activity", "<SectionHeading id=\"service-status-heading\">Service Status");

  assert.deepEqual(labelsFor("OverviewMetric", searchBlock), ["Total recent searches", "No-result searches", "Failed searches"]);
  assert.match(searchBlock, /Top products searched/);
  assert.match(searchBlock, /Search analytics unavailable/);
  assert.doesNotMatch(searchBlock, /AdminMetricCard/);
  assert.match(searchBlock, /href="\/admin\/searches"/);
});

test("service status combines providers and all five system checks with links", () => {
  const serviceBlock = blockBetween("Service Status", "Recent Admin Activity");

  assert.deepEqual(labelsFor("StatusRow", serviceBlock).slice(-5), ["Database", "Authentication", "Email", "Provider credentials", "Webhooks"]);
  assert.match(serviceBlock, /providerReadinessLabel\(provider\)/);
  assert.match(serviceBlock, /href="\/admin\/providers"/);
  assert.match(serviceBlock, /href="\/admin\/system"/);
});

test("recent admin activity remains compact and humanizes labels only at presentation level", () => {
  const activityBlock = blockBetween("Recent Admin Activity", "function SectionHeading");

  assert.match(activityBlock, /RecentActivityList items=\{activity\}/);
  assert.match(adminOverviewPage, /humanizeAuditAction\(item\.title\)/);
  assert.match(adminOverviewPage, /HOMEPAGE_FARES_REFRESHED: "Homepage fares refreshed"/);
  assert.match(adminOverviewPage, /"support_ticket\.reply": "Support ticket reply sent"/);
  assert.match(adminOverviewPage, /"account_deletion\.save_notes": "Account deletion notes updated"/);
  assert.match(activityBlock, /href="\/admin\/logs"/);
  assert.match(adminOverviewPage, /No admin activity yet/);
});

test("forbidden dashboard concepts and controls are not introduced", () => {
  assert.doesNotMatch(adminOverviewPage, /bookings|revenue|payments|Export button|chart|percentage change|fake percentage|notification icon|global search/i);
});

test("existing admin home data helpers remain unchanged and admin shell/navbar are not imported", () => {
  assert.match(adminOverviewPage, /getAdminMetrics\(\)/);
  assert.match(adminOverviewPage, /getProviderStatuses\(\)/);
  assert.match(adminOverviewPage, /getSafeSystemStatus\(\)/);
  assert.match(adminOverviewPage, /getSearchHealth\(\)/);
  assert.match(adminOverviewPage, /getRecentAdminActivity\(\)/);
  assert.doesNotMatch(adminOverviewPage, /AdminShell|AdminNavbar/);
});
