import assert from "node:assert/strict";
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
  return Array.from(block.matchAll(new RegExp(`<${component}[^>]* label="([^"]+)"`, "g")), (match) => match[1]);
}

function sectionOpening(section: string): string {
  const match = adminOverviewPage.match(new RegExp(`<section[^>]*data-admin-home-section="${section}"[^>]*>`));
  assert.ok(match, `${section} section should exist`);
  return match[0];
}

test("admin home creates exactly five outlined sections in the requested order", () => {
  assert.deepEqual(
    Array.from(adminOverviewPage.matchAll(/data-admin-home-section="([^"]+)"/g), (match) => match[1]),
    ["header", "needs-attention", "at-a-glance", "operations", "recent-admin-activity"],
  );

  for (const section of ["header", "needs-attention", "at-a-glance", "operations", "recent-admin-activity"]) {
    assert.match(sectionOpening(section), /className=\{adminHomeSectionClass\}/);
  }

  assert.match(adminOverviewPage, /const adminHomeSectionClass = "border-2 border-\[#8F9BA8\] bg-transparent px-5 py-6 sm:px-6 lg:px-8 lg:py-8"/);
  assert.match(adminOverviewPage, /className="relative isolate grid gap-5 md:gap-6 xl:gap-7"/);
});

test("full-bleed workspace background keeps #F7F6F2 and has no border or shadow", () => {
  const workspaceBlock = blockBetween('data-admin-home-workspace="single-card"', 'function HeroRouteArtwork');
  assert.match(workspaceBlock, /data-admin-home-workspace-background="full-bleed"/);
  assert.match(workspaceBlock, /className="pointer-events-none absolute inset-y-0 left-1\/2 -z-10 w-screen -translate-x-1\/2 bg-\[#F7F6F2\]"/);
  assert.doesNotMatch(workspaceBlock, /border-y|border-t|border-b|shadow-\[/);
  assert.match(adminShell, /isAdminHome && "min-h-\[calc\(100vh-4rem\)\] bg-\[#F7F6F2\] sm:min-h-\[calc\(100vh-68px\)\]"/);
});

test("header rectangle preserves the Admin Home header content and artwork", () => {
  const headerBlock = blockBetween('data-admin-home-section="header"', 'data-admin-home-section="needs-attention"');
  assert.match(headerBlock, /<AdminPageHeader/);
  assert.match(headerBlock, /title="Admin Home"/);
  assert.match(headerBlock, /titleId="admin-home-heading"/);
  assert.match(headerBlock, /Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions\./);
  assert.match(headerBlock, /actions=\{<HeroRouteArtwork \/>\}/);
  assert.doesNotMatch(headerBlock, /border-t|border-b|border-y|divide-x|divide-y/);
});

test("needs attention is one outline with borderless warning items and gap-based columns", () => {
  const attentionBlock = blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"');
  assert.match(attentionBlock, /Needs Attention/);
  assert.match(attentionBlock, /aria-label=\{`\$\{attentionIssues.length\} issues`\}/);
  assert.match(attentionBlock, /data-admin-home-attention-rail="flat" className="mt-4"/);
  assert.match(attentionBlock, /className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4"/);
  assert.doesNotMatch(attentionBlock, /border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|border-\[#A7B2BE\]/);
  assert.match(adminOverviewPage, /data-admin-home-attention-item="flat" className="flex min-w-0 items-start gap-4 py-5"/);
});

test("at a glance keeps six metrics and removes all metric grid dividers", () => {
  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), ["Total users", "Active users", "Suspended users", "Admin users", "Recent searches", "Recent admin actions"]);
  assert.match(glanceBlock, /data-admin-home-metric-rail="flat"/);
  assert.match(glanceBlock, /grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6/);
  assert.doesNotMatch(glanceBlock, /border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|border-\[#A7B2BE\]/);
});

test("search activity and service status share one outline with no internal structural dividers", () => {
  const operationsBlock = blockBetween('data-admin-home-section="operations"', 'data-admin-home-section="recent-admin-activity"');
  assert.match(adminOverviewPage, /<section aria-label="Search Activity and Service Status" data-admin-home-section="operations" className=\{adminHomeSectionClass\}>/);
  assert.match(operationsBlock, /data-admin-home-operations-layout="shared"/);
  assert.match(operationsBlock, /xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/);
  assert.match(operationsBlock, /data-admin-home-surface="search-activity"/);
  assert.match(operationsBlock, /data-admin-home-surface="service-status"/);
  assert.deepEqual(labelsFor("PanelMetric", operationsBlock), ["Total recent searches", "No-result searches", "Failed searches"]);
  assert.match(operationsBlock, /data-admin-home-search-metrics="icon-divider-rail" className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3"/);
  assert.match(operationsBlock, /data-admin-home-service-groups="provider-system" className="mt-5 grid gap-5 md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\] md:gap-6"/);
  assert.doesNotMatch(operationsBlock, /data-admin-home-service-divider|border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|h-px bg-\[#A7B2BE\]|w-px|status-corner/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="status-routes"/);
});

test("recent admin activity uses spacing, not row borders or a timeline connecting line", () => {
  const activityBlock = blockBetween('data-admin-home-section="recent-admin-activity"', 'function HeroRouteArtwork');
  const timelineBlock = blockBetween("function RecentActivityList", "function TextLink");
  assert.match(activityBlock, /Recent Admin Activity/);
  assert.match(activityBlock, /href="\/admin\/logs"/);
  assert.match(timelineBlock, /data-admin-home-timeline="true"/);
  assert.match(timelineBlock, /className="space-y-5"/);
  assert.match(timelineBlock, /grid-cols-\[2\.25rem_minmax\(0,1fr\)\]/);
  assert.match(timelineBlock, /sm:grid-cols-\[2\.25rem_minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(timelineBlock, /border-y|border-b|last:border-b-0|bottom-\[-1rem\]|top-0 w-px|bg-\[#004BB8\]\/25/);
});

test("admin home has no internal structural divider classes or legacy divider colors", () => {
  assert.doesNotMatch(adminOverviewPage, /border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|divide-\[#A7B2BE\]|border-\[#A7B2BE\]|border-slate-200|divide-slate-200/);
});

test("required data, links, icons, badges, and presentation-only labels are preserved", () => {
  assert.match(adminOverviewPage, /const attentionIssues = getAttentionIssues\(providers, system, searchHealth\)/);
  assert.match(adminOverviewPage, /getAdminMetrics\(\)/);
  assert.match(adminOverviewPage, /getProviderStatuses\(\)/);
  assert.match(adminOverviewPage, /getSafeSystemStatus\(\)/);
  assert.match(adminOverviewPage, /getSearchHealth\(\)/);
  assert.match(adminOverviewPage, /getRecentAdminActivity\(\)/);
  assert.match(adminOverviewPage, /Top products searched/);
  assert.match(adminOverviewPage, /href="\/admin\/searches"/);
  assert.match(adminOverviewPage, /href="\/admin\/providers"/);
  assert.match(adminOverviewPage, /href="\/admin\/system"/);
  assert.match(adminOverviewPage, /data-admin-home-status-row="flat"/);
  assert.match(adminOverviewPage, /<AdminStatusBadge tone=\{tone\}>\{status\}<\/AdminStatusBadge>/);
  assert.match(adminOverviewPage, /humanizeAuditAction\(item\.title\)/);
  assert.match(adminOverviewPage, /HOMEPAGE_FARES_REFRESHED: "Homepage fares refreshed"/);
});

test("responsive layout breakpoints remain aligned to the requested widths", () => {
  assert.match(adminOverviewPage, /gap-5 md:gap-6 xl:gap-7/); // 390px uses base gap; 768px uses md; 1280px and 1440px use xl.
  assert.match(adminOverviewPage, /md:grid-cols-2 xl:grid-cols-4/); // Needs Attention: 390 one column, 768 two, 1280+ four.
  assert.match(adminOverviewPage, /grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6/); // At a Glance: 390 two, 768 three, 1280+ six.
  assert.match(adminOverviewPage, /grid gap-0 xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/); // Operations: stacked through 1024, side-by-side at 1280+.
  assert.match(adminOverviewPage, /sm:grid-cols-3/); // Search metrics: one column at 390, three by 768+.
});

test("navbar remains unchanged and no nested section cards are introduced", () => {
  assert.match(adminShell, /<header className="sticky top-0 z-30 border-b border-\[#DDE7F0\] bg-white\/95 backdrop-blur">/);
  assert.match(adminShell, /Kurioticket/);
  assert.doesNotMatch(adminOverviewPage, /AdminSectionCard|AdminMetricCard|bg-white|shadow|gradient|rounded-2xl/);
});
