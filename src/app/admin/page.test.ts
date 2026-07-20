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
  return Array.from(block.matchAll(new RegExp(`<${component}[^>]* label="([^"]+)"`, "g")), (match) => match[1]);
}

test("admin home header keeps the approved title and description without fake controls", () => {
  assert.match(adminOverviewPage, /title="Admin Home"/);
  assert.match(adminOverviewPage, /Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions\./);
  assert.match(adminOverviewPage, /eyebrow=""/);
  assert.doesNotMatch(adminOverviewPage, /Welcome back|Bisola|date picker|export button|global search|notifications/i);
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

test("needs attention uses a flat rail instead of nested cards", () => {
  const attentionBlock = blockBetween("<SectionHeading id=\"needs-attention-heading\">Needs Attention", "<SectionHeading id=\"at-a-glance-heading\">At a Glance");
  assert.match(attentionBlock, /data-admin-home-attention-rail="flat"/);
  assert.match(adminOverviewPage, /data-admin-home-attention-item="flat"/);
  assert.doesNotMatch(attentionBlock, /AdminSectionCard/);
});

test("at a glance preserves all six metrics in order as a flat responsive metric rail", () => {
  const glanceBlock = blockBetween("At a Glance", "Search Activity");
  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), ["Total users", "Active users", "Suspended users", "Admin users", "Recent searches", "Recent admin actions"]);
  assert.match(glanceBlock, /data-admin-home-metric-rail="flat"/);
  assert.match(glanceBlock, /grid-cols-2/);
  assert.match(glanceBlock, /md:grid-cols-3/);
  assert.match(glanceBlock, /xl:grid-cols-6/);
  assert.match(glanceBlock, /hint="Last 7 days"/);
  assert.doesNotMatch(glanceBlock, /AdminSectionCard|AdminMetricCard/);
});

test("provider readiness large-card section is absent but providers remain represented in service status", () => {
  assert.doesNotMatch(adminOverviewPage, /<SectionHeading[^>]*>Provider Readiness<\/SectionHeading>|AdminProviderStatusCard|Operations Snapshot/);
  const serviceBlock = blockBetween("<SectionHeading id=\"service-status-heading\">Service Status", "Recent Admin Activity");
  assert.match(serviceBlock, /providers\.map/);
  assert.match(serviceBlock, /provider\.product/);
  const adminData = readFileSync("src/lib/admin-data.ts", "utf8");
  assert.match(adminData, /product: "Flights"/);
  assert.match(adminData, /product: "Hotels"/);
  assert.match(adminData, /product: "Cars"/);
});

test("search activity has one outer surface, flat metrics, preserved data and a decorative motif", () => {
  const searchBlock = blockBetween("<SectionHeading id=\"search-activity-heading\">Search Activity", "<SectionHeading id=\"service-status-heading\">Service Status");
  assert.deepEqual(labelsFor("PanelMetric", searchBlock), ["Total recent searches", "No-result searches", "Failed searches"]);
  assert.match(searchBlock, /data-admin-home-surface="search-activity"/);
  assert.equal((searchBlock.match(/data-admin-home-surface="search-activity"/g) || []).length, 1);
  assert.match(searchBlock, /Top products searched/);
  assert.match(searchBlock, /Search analytics unavailable/);
  assert.match(searchBlock, /href="\/admin\/searches"/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="search-route"/);
  assert.doesNotMatch(searchBlock, /AdminMetricCard|chart/i);
});

test("service status has one outer surface, two flat status columns and all required links", () => {
  const serviceBlock = blockBetween("<SectionHeading id=\"service-status-heading\">Service Status", "Recent Admin Activity");
  assert.match(serviceBlock, /data-admin-home-surface="service-status"/);
  assert.equal((serviceBlock.match(/data-admin-home-surface="service-status"/g) || []).length, 1);
  assert.match(serviceBlock, /Provider statuses/);
  assert.match(serviceBlock, /System statuses/);
  assert.deepEqual(labelsFor("StatusRow", serviceBlock).slice(-5), ["Database", "Authentication", "Email", "Provider credentials", "Webhooks"]);
  assert.match(serviceBlock, /providerReadinessLabel\(provider\)/);
  assert.match(serviceBlock, /href="\/admin\/providers"/);
  assert.match(serviceBlock, /href="\/admin\/system"/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="status-corner"/);
  assert.match(adminOverviewPage, /data-admin-home-status-row="flat"/);
});

test("recent admin activity uses timeline markup and humanizes labels only at presentation level", () => {
  const activityBlock = blockBetween("Recent Admin Activity", "function HeroRouteArtwork");
  assert.match(activityBlock, /RecentActivityList items=\{activity\}/);
  assert.match(adminOverviewPage, /data-admin-home-timeline="true"/);
  assert.match(adminOverviewPage, /humanizeAuditAction\(item\.title\)/);
  assert.match(adminOverviewPage, /HOMEPAGE_FARES_REFRESHED: "Homepage fares refreshed"/);
  assert.match(adminOverviewPage, /"support_ticket\.reply": "Support ticket reply sent"/);
  assert.match(adminOverviewPage, /"account_deletion\.save_notes": "Account deletion notes updated"/);
  assert.match(activityBlock, /href="\/admin\/logs"/);
  assert.match(adminOverviewPage, /No admin activity yet/);
});

test("decorative elements are aria-hidden and pointer-events-none", () => {
  assert.match(adminOverviewPage, /data-admin-home-hero-artwork="route-lines"[^>]*aria-hidden="true"[^>]*className="pointer-events-none/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="search-route"[^>]*aria-hidden="true"[^>]*className="pointer-events-none/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="status-corner"[^>]*aria-hidden="true"[^>]*className="pointer-events-none/);
});

test("forbidden dashboard concepts and controls are not introduced", () => {
  assert.doesNotMatch(adminOverviewPage, /bookings|revenue|payments|refunds|percentage change|fake percentage|Admin Home navbar|sidebar|second navbar/i);
});

test("existing admin home data helpers remain unchanged and admin shell navbar are not imported", () => {
  assert.match(adminOverviewPage, /getAdminMetrics\(\)/);
  assert.match(adminOverviewPage, /getProviderStatuses\(\)/);
  assert.match(adminOverviewPage, /getSafeSystemStatus\(\)/);
  assert.match(adminOverviewPage, /getSearchHealth\(\)/);
  assert.match(adminOverviewPage, /getRecentAdminActivity\(\)/);
  assert.doesNotMatch(adminOverviewPage, /AdminShell|AdminNavbar/);
  assert.doesNotMatch(adminOverviewPage, /from "@\/lib\/admin-data";[\s\S]*get[A-Z][A-Za-z]+Extra/);
});
