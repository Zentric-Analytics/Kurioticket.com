import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminOverviewPage = readFileSync("src/app/admin/page.tsx", "utf8");
const adminShell = readFileSync("src/components/admin/AdminPageShell.tsx", "utf8");

function blockBetween(start: string, end: string): string {
  const startIndex = adminOverviewPage.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} should exist`);
  const endIndex = adminOverviewPage.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} should exist after ${start}`);
  return adminOverviewPage.slice(startIndex, endIndex);
}

function labelsFor(component: string, block = adminOverviewPage): string[] {
  return Array.from(
    block.matchAll(new RegExp(`<${component}[^>]* label="([^"]+)"`, "g")),
    (match) => match[1],
  );
}

test("documents the historical mobile reference commit", () => {
  assert.match(
    adminOverviewPage,
    /Mobile layout reference: a392740a44882ef439b3f681ed28a470d4b98842\n\/\/ \(the src\/app\/admin\/page\.tsx revision immediately before f157bfa517c159cc5023888e8866bf3949466c39\)\./,
  );
  const fileHistory = execSync(
    `git log --follow --format="%H" -- src/app/admin/page.tsx`,
    { encoding: "utf8" },
  ).trim().split("\n");
  const previousReferenceIndex = fileHistory.indexOf("f157bfa517c159cc5023888e8866bf3949466c39");

  assert.notEqual(previousReferenceIndex, -1);
  assert.equal(fileHistory[previousReferenceIndex + 1], "a392740a44882ef439b3f681ed28a470d4b98842");
});

test("mobile base classes restore the immediately older section rectangles", () => {
  assert.match(
    adminOverviewPage,
    /const adminHomeSectionClass = "border-2 border-\[#8F9BA8\] bg-transparent px-5 py-6 sm:px-6 md:border-0 lg:px-8 lg:py-8";/,
  );
});

test("mobile base classes restore the pre-outline Needs Attention layout", () => {
  // Historical reference a392740a44882ef439b3f681ed28a470d4b98842 used the f157bfa
  // inner layout plus mobile-only section rectangles on the outer section wrapper.
  const attentionBlock = blockBetween(
    'data-admin-home-section="needs-attention"',
    'data-admin-home-section="at-a-glance"',
  );
  const borderHelperBlock = blockBetween(
    "function attentionCellBorderClass",
    "function AttentionRow",
  );

  assert.match(
    attentionBlock,
    /data-admin-home-attention-outline="true"[\s\S]*?className="overflow-hidden rounded-none bg-transparent md:border md:border-\[#7B8794\]"/,
  );
  assert.match(
    attentionBlock,
    /data-admin-home-attention-heading="section-header"[\s\S]*?className="md:px-6 md:pt-6 lg:px-8 lg:pt-8"/,
  );
  assert.match(
    attentionBlock,
    /data-admin-home-attention-rail="outlined-grid"[\s\S]*?className="mt-4 grid gap-x-6 gap-y-5 md:mt-6 md:grid-cols-2 md:gap-0"/,
  );
  assert.match(
    adminOverviewPage,
    /data-admin-home-attention-item="outlined-grid-cell"[\s\S]*?className=\{`flex min-w-0 items-start gap-4 py-5 md:h-full md:flex-col md:gap-0 md:p-6 \$\{className\}`\}/,
  );
  assert.doesNotMatch(borderHelperBlock, /border-b border-\[#7B8794\]|border-r border-\[#7B8794\]/);
  assert.match(borderHelperBlock, /md:border-l/);
  assert.match(borderHelperBlock, /md:border-\[#7B8794\]/);
});

test("mobile base classes restore the pre-outline At a Glance metric layout", () => {
  // Historical reference a392740a44882ef439b3f681ed28a470d4b98842 used a two-column
  // mobile metric rail with gap-x-6 gap-y-5 and no base #7B8794 cell dividers.
  const glanceBlock = blockBetween(
    'data-admin-home-section="at-a-glance"',
    'data-admin-home-section="operations"',
  );
  const borderHelperBlock = blockBetween(
    "function overviewMetricCellBorderClass",
    "const metricIcons",
  );

  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), [
    "Total users",
    "Active users",
    "Suspended users",
    "Admin users",
    "Recent searches",
    "Recent admin actions",
  ]);
  assert.match(
    glanceBlock,
    /data-admin-home-glance-outline="true"[\s\S]*?className="overflow-hidden rounded-none bg-transparent md:border md:border-\[#7B8794\]"/,
  );
  assert.match(
    glanceBlock,
    /data-admin-home-glance-heading="section-header"[\s\S]*?className="md:px-6 md:pt-6 lg:px-8 lg:pt-8"/,
  );
  assert.match(
    glanceBlock,
    /data-admin-home-glance-grid="outlined"[\s\S]*?className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 md:mt-6 md:grid-cols-3 md:gap-0"/,
  );
  assert.doesNotMatch(borderHelperBlock, /isMobile|border-r border-\[#7B8794\]|border-b border-\[#7B8794\]/);
  assert.match(borderHelperBlock, /md:border-r/);
  assert.match(borderHelperBlock, /md:border-b/);
  assert.match(borderHelperBlock, /md:border-\[#7B8794\]/);
});

test("mobile base classes restore the pre-outline Search Activity layout", () => {
  const searchBlock = blockBetween(
    'data-admin-home-surface="search-activity"',
    'data-admin-home-surface="service-status"',
  );
  const borderHelperBlock = blockBetween(
    "function searchMetricBorderClass",
    "function attentionCellBorderClass",
  );

  assert.deepEqual(labelsFor("PanelMetric", searchBlock), [
    "Total recent searches",
    "No-result searches",
    "Failed searches",
  ]);
  assert.match(
    searchBlock,
    /className="relative min-h-\[17rem\] overflow-hidden px-5 py-6 sm:px-6 md:rounded-none md:border md:border-\[#7B8794\] md:bg-transparent md:px-0 md:py-0 lg:px-0 lg:py-0"/,
  );
  assert.match(
    searchBlock,
    /data-admin-home-search-heading="section-header"[\s\S]*?className="md:px-6 md:pt-6 lg:px-8 lg:pt-8"/,
  );
  assert.match(
    searchBlock,
    /data-admin-home-search-metrics="outlined-grid"[\s\S]*?className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3 md:gap-0"/,
  );
  assert.match(
    searchBlock,
    /data-admin-home-search-lower="products-link"[\s\S]*?className="mt-6 md:mt-0 md:border-t md:border-\[#7B8794\] md:px-6 md:py-5 lg:px-8"/,
  );
  assert.doesNotMatch(borderHelperBlock, /border-b border-\[#7B8794\]|sm:border-\[#7B8794\]/);
  assert.match(borderHelperBlock, /md:border-r/);
});

test("mobile base classes restore the pre-outline Service Status grouping", () => {
  const serviceBlock = blockBetween(
    'data-admin-home-surface="service-status"',
    'data-admin-home-section="recent-admin-activity"',
  );

  assert.match(
    serviceBlock,
    /className="relative min-h-\[17rem\] overflow-hidden px-5 py-6 sm:px-6 md:px-0 md:py-0"/,
  );
  assert.match(
    serviceBlock,
    /data-admin-home-service-heading="section-header"[\s\S]*?className="md:px-6 md:pt-6 lg:px-8 lg:pt-8"/,
  );
  assert.match(
    serviceBlock,
    /className="mt-5 md:mt-6 md:px-6 md:pb-6 lg:px-8 lg:pb-8"[\s\S]*?data-admin-home-service-groups="provider-system"[\s\S]*?className="grid items-start gap-5 md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\] md:gap-6"/,
  );
  assert.match(serviceBlock, /Provider Readiness/);
  assert.match(serviceBlock, /Search availability by product/);
  assert.match(serviceBlock, /System Configuration/);
  assert.match(serviceBlock, /Core platform services and integrations/);
  assert.match(
    serviceBlock,
    /data-admin-home-provider-status-outline="true"[\s\S]*?className="flex min-w-0 flex-col md:rounded-none md:border md:border-\[#7B8794\] md:bg-transparent md:p-6"/,
  );
  assert.match(
    serviceBlock,
    /data-admin-home-system-status-outline="true"[\s\S]*?className="flex min-w-0 flex-col md:rounded-none md:border md:border-\[#7B8794\] md:bg-transparent md:p-6"/,
  );
});

test("mobile lines are not newly invented and strong outlines are gated to md", () => {
  const mobileStrongLinePatterns = [
    /className="[^"]* border border-\[#7B8794\]/,
    /className="[^"]* border-t border-\[#7B8794\]/,
    /className="[^"]* border-b border-\[#7B8794\]/,
    /className="[^"]* border-r border-\[#7B8794\]/,
    /className="[^"]* border-l border-\[#7B8794\]/,
  ];

  for (const pattern of mobileStrongLinePatterns) {
    assert.doesNotMatch(adminOverviewPage, pattern);
  }

  assert.match(adminOverviewPage, /md:border md:border-\[#7B8794\]/);
  assert.match(adminOverviewPage, /md:border-t md:border-\[#7B8794\]/);
  assert.match(adminOverviewPage, /md:border-\[#7B8794\]/);
});

test("desktop outlined design, actions, and content remain preserved", () => {
  assert.match(adminOverviewPage, /md:grid-cols-2 md:gap-0/);
  assert.match(adminOverviewPage, /md:grid-cols-3 md:gap-0/);
  assert.match(adminOverviewPage, /md:border-t md:border-\[#7B8794\]/);
  assert.match(adminOverviewPage, /md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\] md:gap-6/);

  for (const [action, href, label] of [
    ["view-searches", "/admin/searches", "View Searches"],
    ["view-providers", "/admin/providers", "View Providers"],
    ["view-system", "/admin/system", "View System"],
    ["view-admin-logs", "/admin/logs", "View Admin Logs"],
  ]) {
    assert.match(
      adminOverviewPage,
      new RegExp(`<AdminHomeActionButton href="${href}" action="${action}">${label}<\/AdminHomeActionButton>`),
    );
  }

  assert.match(adminOverviewPage, /data-admin-home-attention-footer="action"[\s\S]*?justify-end/);
  assert.deepEqual(labelsFor("StatusRow", blockBetween('data-admin-home-system-status-outline="true"', 'data-admin-home-section="recent-admin-activity"')), [
    "Database connection",
    "Authentication",
    "Email service",
    "Provider credentials",
    "Webhooks",
  ]);
});

test("header, background, data loading, status row order, and navbar remain unchanged", () => {
  assert.match(adminOverviewPage, /title="Admin Home"/);
  assert.match(adminOverviewPage, /bg-\[#F7F6F2\]/);
  assert.match(adminShell, /isAdminHome && "min-h-\[calc\(100vh-4rem\)\] bg-\[#F7F6F2\] sm:min-h-\[calc\(100vh-68px\)\]"/);
  assert.match(adminOverviewPage, /getAdminMetrics\(\)/);
  assert.match(adminOverviewPage, /getProviderStatuses\(\)/);
  assert.match(adminOverviewPage, /getSafeSystemStatus\(\)/);
  assert.match(adminOverviewPage, /getSearchHealth\(\)/);
  assert.match(adminOverviewPage, /getRecentAdminActivity\(\)/);
  assert.match(
    adminOverviewPage,
    /data-admin-home-status-row="aligned"[\s\S]*?<Icon[\s\S]*?<span className="min-w-0 font-medium text-slate-700">\{label\}<\/span>[\s\S]*?<span className="justify-self-end whitespace-nowrap">/,
  );
});
