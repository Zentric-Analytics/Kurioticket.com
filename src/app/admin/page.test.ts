import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminOverviewPage = readFileSync("src/app/admin/page.tsx", "utf8");

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
