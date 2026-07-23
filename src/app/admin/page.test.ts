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

function assertMobileOuterBox(block: string, marker: string) {
  assert.match(
    block,
    new RegExp(`${marker}[\\s\\S]*?className="[^"]*w-full[^"]*overflow-hidden[^"]*rounded-none[^"]*border border-\\[#A7B2BE\\][^"]*bg-transparent`),
  );
}

test("documents the historical desktop and frozen mobile reference commits", () => {
  assert.match(
    adminOverviewPage,
    /Desktop\/tablet layout reference: f157bfa517c159cc5023888e8866bf3949466c39\n\/\/ Mobile layout reference: 862fa27e580571298107bc291dd8fdcb0806dfb7\n\/\/ Desktop restoration must not alter rendering below the md breakpoint\./,
  );
  const fileHistory = execSync(
    `git log --follow --format="%H" -- src/app/admin/page.tsx`,
    { encoding: "utf8" },
  ).trim().split("\n");

  assert.ok(fileHistory.length > 0);
  assert.equal(execSync(`git cat-file -t f157bfa517c159cc5023888e8866bf3949466c39`, { encoding: "utf8" }).trim(), "commit");
  assert.equal(execSync(`git cat-file -t 862fa27e580571298107bc291dd8fdcb0806dfb7`, { encoding: "utf8" }).trim(), "commit");
});

test("mobile major sections use full-width square #A7B2BE boxes while the header remains unboxed", () => {
  assert.match(adminOverviewPage, /const adminHomeSectionClass = "py-2 md:px-6 md:py-6 lg:px-8 lg:py-8";/);

  const headerBlock = blockBetween('data-admin-home-section="header"', 'data-admin-home-section="needs-attention"');
  assert.doesNotMatch(headerBlock, /border border-\[#A7B2BE\]|data-admin-home-[a-z-]+-outline="true"/);

  assertMobileOuterBox(blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"'), 'data-admin-home-attention-outline="true"');
  assertMobileOuterBox(blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"'), 'data-admin-home-glance-outline="true"');
  assertMobileOuterBox(blockBetween('data-admin-home-surface="search-activity"', 'data-admin-home-surface="service-status"'), 'data-admin-home-surface="search-activity"');
  assertMobileOuterBox(blockBetween('data-admin-home-surface="service-status"', 'data-admin-home-section="recent-admin-activity"'), 'data-admin-home-surface="service-status"');
  assertMobileOuterBox(blockBetween('data-admin-home-section="recent-admin-activity"', '</div>\n  );'), 'data-admin-home-activity-outline="true"');
});

test("full-width mobile dividers sit outside horizontal padding", () => {
  const attentionBlock = blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"');
  assert.match(attentionBlock, /data-admin-home-attention-heading="section-header"[\s\S]*?className="px-5 py-5/);
  assert.match(attentionBlock, /data-admin-home-attention-rail="outlined-grid" className="grid divide-y divide-\[#A7B2BE\] border-t border-\[#A7B2BE\]/);
  assert.match(adminOverviewPage, /data-admin-home-attention-item="outlined-grid-cell"[\s\S]*?px-5 py-5/);

  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  assert.match(glanceBlock, /data-admin-home-glance-heading="section-header"[\s\S]*?className="px-5 py-5/);
  assert.match(glanceBlock, /data-admin-home-glance-grid="outlined" className="grid grid-cols-2 border-t border-\[#A7B2BE\]/);

  const searchBlock = blockBetween('data-admin-home-surface="search-activity"', 'data-admin-home-surface="service-status"');
  assert.match(searchBlock, /data-admin-home-search-heading="section-header"[\s\S]*?className="px-5 py-5/);
  assert.match(searchBlock, /data-admin-home-search-metrics="outlined-grid" className="grid grid-cols-1 divide-y divide-\[#A7B2BE\] border-t border-\[#A7B2BE\]/);
  assert.match(searchBlock, /data-admin-home-search-lower="products-link"[\s\S]*?className="border-t border-\[#A7B2BE\] px-5 py-5/);

  const serviceBlock = blockBetween('data-admin-home-surface="service-status"', 'data-admin-home-section="recent-admin-activity"');
  assert.match(serviceBlock, /data-admin-home-service-heading="section-header"[\s\S]*?className="px-5 py-5/);
  assert.match(serviceBlock, /className="border-t border-\[#A7B2BE\] md:mt-5 md:border-t-0/);
  assert.match(serviceBlock, /data-admin-home-system-status-outline="true"[\s\S]*?className="flex min-w-0 flex-col border-t border-\[#A7B2BE\] px-5 py-5/);

  const activityBlock = blockBetween('data-admin-home-section="recent-admin-activity"', '</div>\n  );');
  assert.match(activityBlock, /data-admin-home-activity-heading="section-header"[\s\S]*?className="px-5 py-5/);
  assert.match(activityBlock, /className="border-t border-\[#A7B2BE\] md:mt-3 md:border-t-0"/);
  assert.match(activityBlock, /data-admin-home-activity-footer="actions" className="flex justify-end border-t border-\[#A7B2BE\] px-5 py-5/);
  assert.match(adminOverviewPage, /border-b border-\[#A7B2BE\] px-5 py-4 text-sm last:border-b-0/);
});

test("At a Glance preserves mobile cell rules and desktop #7B8794 grid rules", () => {
  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  const borderHelperBlock = blockBetween("function overviewMetricCellBorderClass", "const metricIcons");

  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), [
    "Total users",
    "Active users",
    "Suspended users",
    "Admin users",
    "Recent searches",
    "Recent admin actions",
  ]);
  assert.match(borderHelperBlock, /isMobileLeftColumn \? "border-r border-\[#A7B2BE\]" : ""/);
  assert.match(borderHelperBlock, /isMobileBeforeLastRow \? "border-b border-\[#A7B2BE\]" : ""/);
  assert.match(borderHelperBlock, /"md:border-r-0 md:border-b-0"/);
  assert.match(borderHelperBlock, /isDesktopLastColumn \? "md:border-r-0" : "md:border-r"/);
  assert.match(borderHelperBlock, /isDesktopFirstRow \? "md:border-b" : "md:border-b-0"/);
  assert.match(borderHelperBlock, /md:border-\[#7B8794\] md:border-0/);
});

test("Service Status is one mobile box but Provider and System restore desktop open groups", () => {
  const serviceBlock = blockBetween('data-admin-home-surface="service-status"', 'data-admin-home-section="recent-admin-activity"');

  assert.match(serviceBlock, /data-admin-home-surface="service-status" className="[^"]*border border-\[#A7B2BE\][^"]*md:border-0/);
  assert.match(serviceBlock, /data-admin-home-service-groups="provider-system"[\s\S]*?md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\] md:gap-6/);
  assert.match(serviceBlock, /data-admin-home-provider-status-outline="true"[\s\S]*?className="flex min-w-0 flex-col px-5 py-5 md:border-0 md:p-0"/);
  assert.match(serviceBlock, /data-admin-home-system-status-outline="true"[\s\S]*?className="flex min-w-0 flex-col border-t border-\[#A7B2BE\] px-5 py-5 md:mt-0 md:border-0 md:p-0"/);
  assert.doesNotMatch(serviceBlock, /mt-7 flex min-w-0 flex-col border-t border-\[#A7B2BE\] pt-7/);
  assert.match(serviceBlock, /Provider Readiness/);
  assert.match(serviceBlock, /System Configuration/);
});


test("Recent Admin Activity restores the borderless desktop timeline while freezing mobile separators", () => {
  const activityBlock = blockBetween('data-admin-home-section="recent-admin-activity"', '</div>\n  );');

  assert.match(activityBlock, /data-admin-home-activity-outline="true"[\s\S]*?border border-\[#A7B2BE\][^"]*md:overflow-visible md:border-0/);
  assert.match(activityBlock, /data-admin-home-activity-heading="section-header"[\s\S]*?className="px-5 py-5 md:px-0 md:py-0"/);
  assert.match(activityBlock, /className="border-t border-\[#A7B2BE\] md:mt-3 md:border-t-0"/);
  assert.match(adminOverviewPage, /data-admin-home-timeline="true" className="md:border-y-0"><div className="md:space-y-5">/);
  assert.match(adminOverviewPage, /border-b border-\[#A7B2BE\] px-5 py-4 text-sm last:border-b-0 md:border-b-0 md:px-0 md:py-0/);
  assert.match(adminOverviewPage, /bg-\[#004BB8\]\/25 md:hidden/);
  assert.match(activityBlock, /data-admin-home-activity-footer="actions" className="flex justify-end border-t border-\[#A7B2BE\] px-5 py-5 md:mt-6 md:border-t-0 md:px-0 md:py-0"/);
});

test("desktop flat pre-mobile design, actions, and content remain preserved", () => {
  assert.match(adminOverviewPage, /md:grid-cols-2[^"]*md:items-stretch[^"]*md:gap-x-6 md:gap-y-5[^"]*xl:grid-cols-4/);
  assert.match(adminOverviewPage, /md:grid-cols-3 md:gap-x-6 md:gap-y-5[^"]*xl:grid-cols-6/);
  assert.doesNotMatch(adminOverviewPage, /md:border-t md:border-\[#7B8794\]/);
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
