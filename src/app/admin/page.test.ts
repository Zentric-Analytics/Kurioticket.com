import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminOverviewPage = readFileSync("src/app/admin/page.tsx", "utf8");


function sectionClassNameBefore(heading: string): string {
  const headingIndex = adminOverviewPage.indexOf(heading);
  assert.notEqual(headingIndex, -1, `${heading} heading should exist`);

  const prefix = adminOverviewPage.slice(0, headingIndex);
  const sectionMatches = Array.from(prefix.matchAll(/<section className="([^"]+)"/g));
  assert.ok(sectionMatches.length > 0, `${heading} wrapper section className should exist`);

  return sectionMatches.at(-1)![1];
}

function blockBetween(start: string, end: string): string {
  const startIndex = adminOverviewPage.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} should exist`);
  const endIndex = adminOverviewPage.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} should exist after ${start}`);

  return adminOverviewPage.slice(startIndex, endIndex);
}

function classNameAfter(heading: string): string {
  const headingIndex = adminOverviewPage.indexOf(heading);
  assert.notEqual(headingIndex, -1, `${heading} heading should exist`);

  const classNameMatch = adminOverviewPage.slice(headingIndex).match(/<div className="([^"]+)"/);
  assert.ok(classNameMatch, `${heading} grid className should exist`);

  return classNameMatch[1];
}

test("admin overview operations snapshot keeps a stable one, two, then three column grid", () => {
  const operationsGrid = classNameAfter("Operations Snapshot");

  assert.match(operationsGrid, /\bgrid-cols-1\b/);
  assert.match(operationsGrid, /\bsm:grid-cols-2\b/);
  assert.match(operationsGrid, /\blg:grid-cols-3\b/);
  assert.doesNotMatch(operationsGrid, /\bxl:grid-cols-6\b/);
});

test("admin overview operations snapshot preserves the six metric cards in order", () => {
  const metricLabels = Array.from(
    adminOverviewPage.matchAll(/<AdminMetricCard label="([^"]+)" value=\{metrics\.[^}]+\}/g),
    (match) => match[1],
  );

  assert.deepEqual(metricLabels, [
    "Total users",
    "Active users",
    "Suspended users",
    "Admin users",
    "Recent searches",
    "Recent admin actions",
  ]);
});

test("admin overview provider readiness uses one column until the laptop three column breakpoint", () => {
  const providerGrid = classNameAfter("Provider Readiness");

  assert.match(providerGrid, /\bgrid-cols-1\b/);
  assert.match(providerGrid, /\blg:grid-cols-3\b/);
  assert.doesNotMatch(providerGrid, /\bxl:grid-cols-3\b/);
  assert.match(adminOverviewPage, /providers\.map\(\(provider\) => <AdminProviderStatusCard key=\{provider\.product\} \{\.\.\.provider\} \/>\)/);
});

test("admin overview search and platform health use a laptop-safe two column wrapper", () => {
  const healthWrapper = sectionClassNameBefore("Search Health");

  assert.match(healthWrapper, /\bmt-8\b/);
  assert.match(healthWrapper, /\bgrid\b/);
  assert.match(healthWrapper, /\bgap-4\b/);
  assert.match(healthWrapper, /\blg:grid-cols-\[minmax\(0,1\.2fr\)_minmax\(280px,0\.8fr\)\]/);
  assert.doesNotMatch(healthWrapper, /\bxl:grid-cols-\[1\.2fr_0\.8fr\]/);
  assert.doesNotMatch(adminOverviewPage, /xl:grid-cols-\[1\.2fr_0\.8fr\]/);
});

test("admin overview health columns can shrink without horizontal overflow", () => {
  assert.match(adminOverviewPage, /<div className="min-w-0">\n          <h2 className="text-lg font-semibold text-slate-950">Search Health<\/h2>/);
  assert.match(adminOverviewPage, /<div className="min-w-0">\n          <h2 className="text-lg font-semibold text-slate-950">Platform Health<\/h2>/);
});

test("admin overview search health content remains unchanged", () => {
  const searchHealthBlock = blockBetween("Search Health", "Platform Health");

  assert.match(searchHealthBlock, /<AdminMetricCard label="Total recent searches" value=\{searchHealth\.totalRecentSearches\} \/>/);
  assert.match(searchHealthBlock, /<AdminMetricCard label="No-result searches" value=\{searchHealth\.noResultSearches\} tone="warn" \/>/);
  assert.match(searchHealthBlock, /<AdminMetricCard label="Failed searches" value=\{searchHealth\.failedSearches\} tone="bad" \/>/);
  assert.match(searchHealthBlock, /<div className="grid gap-4 sm:grid-cols-3">/);
  assert.match(searchHealthBlock, /Top products searched/);
  assert.match(searchHealthBlock, /AdminEmptyState title="Search analytics unavailable" message="Search analytics will appear after search logging records real user searches\. No search counts are mocked\."/);
});

test("admin overview platform health content remains unchanged", () => {
  const platformHealthBlock = blockBetween("Platform Health", "Admin Activity");

  assert.match(platformHealthBlock, /<HealthRow label="Database" ok=\{system\.databaseConnected\} fallback=\{system\.databaseConfigured \? "Configured, not connected" : "Not configured"\} \/>/);
  assert.match(platformHealthBlock, /<HealthRow label="Auth\/session" ok=\{system\.authConfigured && system\.sessionConfigured\} fallback="Not fully configured" \/>/);
  assert.match(platformHealthBlock, /<HealthRow label="Email \/ Resend" ok=\{system\.emailConfigured\} fallback="Unavailable" \/>/);
  assert.match(platformHealthBlock, /<HealthRow label="Provider credentials" ok=\{system\.providerCredentialsPresent\} fallback="Not present" \/>/);
  assert.match(platformHealthBlock, /<HealthRow label="Webhooks" ok=\{system\.webhookConfigured\} fallback="Unavailable" \/>/);
});

test("admin overview data helpers, queries, and other sections remain unchanged", () => {
  assert.match(adminOverviewPage, /getAdminMetrics\(\)/);
  assert.match(adminOverviewPage, /getProviderStatuses\(\)/);
  assert.match(adminOverviewPage, /getSafeSystemStatus\(\)/);
  assert.match(adminOverviewPage, /getSearchHealth\(\)/);
  assert.match(adminOverviewPage, /getRecentAdminActivity\(\)/);
  assert.match(adminOverviewPage, /<h2 className="text-lg font-semibold text-slate-950">Search Health<\/h2>/);
  assert.match(adminOverviewPage, /<h2 className="text-lg font-semibold text-slate-950">Platform Health<\/h2>/);
  assert.match(adminOverviewPage, /<h2 className="text-lg font-semibold text-slate-950">Admin Activity<\/h2>/);
});
