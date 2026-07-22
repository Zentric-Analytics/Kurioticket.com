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

test("admin home creates exactly five sections in the requested order", () => {
  assert.deepEqual(
    Array.from(adminOverviewPage.matchAll(/data-admin-home-section="([^"]+)"/g), (match) => match[1]),
    ["header", "needs-attention", "at-a-glance", "operations", "recent-admin-activity"],
  );

  for (const section of ["header", "needs-attention", "at-a-glance", "operations", "recent-admin-activity"]) {
    assert.match(sectionOpening(section), /className=\{adminHomeSectionClass\}/);
  }

  assert.match(adminOverviewPage, /const adminHomeSectionClass = "bg-transparent px-5 py-6 sm:px-6 lg:px-8 lg:py-8"/);
  assert.match(adminOverviewPage, /className="relative isolate grid gap-5 md:gap-6 xl:gap-7"/);
});

test("full-bleed workspace background keeps #F7F6F2 and has no border or shadow", () => {
  const workspaceBlock = blockBetween('data-admin-home-workspace="single-card"', 'function HeroRouteArtwork');
  assert.match(workspaceBlock, /data-admin-home-workspace-background="full-bleed"/);
  assert.match(workspaceBlock, /className="pointer-events-none absolute inset-y-0 left-1\/2 -z-10 w-screen -translate-x-1\/2 bg-\[#F7F6F2\]"/);
  assert.doesNotMatch(workspaceBlock, /border-y|border-t|border-b|shadow-\[/);
  assert.match(adminShell, /isAdminHome && "min-h-\[calc\(100vh-4rem\)\] bg-\[#F7F6F2\] sm:min-h-\[calc\(100vh-68px\)\]"/);
});

test("header section preserves the Admin Home header content and artwork", () => {
  const headerBlock = blockBetween('data-admin-home-section="header"', 'data-admin-home-section="needs-attention"');
  assert.match(headerBlock, /<AdminPageHeader/);
  assert.match(headerBlock, /title="Admin Home"/);
  assert.match(headerBlock, /titleId="admin-home-heading"/);
  assert.match(headerBlock, /Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions\./);
  assert.match(headerBlock, /actions=\{<HeroRouteArtwork \/>\}/);
  assert.doesNotMatch(headerBlock, /border-t|border-b|border-y|divide-x|divide-y/);
});

test("needs attention uses one outlined responsive grid without card styling", () => {
  const attentionBlock = blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"');
  assert.match(attentionBlock, /data-admin-home-attention-outline="true" className="overflow-hidden rounded-none border border-\[#7B8794\] bg-transparent"/);
  assert.match(attentionBlock, /data-admin-home-attention-rail="outlined-grid" className="grid md:grid-cols-2"/);
  assert.doesNotMatch(attentionBlock, /xl:grid-cols-4/);
  assert.match(attentionBlock, /attentionIssues\.map\(\(issue, index\) =>/);
  assert.match(attentionBlock, /heading=\{index === 0 \? \(/);
  assert.match(attentionBlock, /data-admin-home-attention-heading="in-first-cell" className="mb-5 flex flex-wrap items-center gap-3"/);
  assert.match(attentionBlock, /aria-label=\{`\$\{attentionIssues.length\} issues`\}/);
  assert.doesNotMatch(attentionBlock, /data-admin-home-attention-heading-row|border-b[^\n]*needs-attention-heading/);
  assert.match(adminOverviewPage, /data-admin-home-attention-item="outlined-grid-cell" className=\{`min-w-0 p-5 sm:p-6 \$\{className\}`\}/);
  assert.doesNotMatch(attentionBlock, /data-admin-home-attention-item="card"|shadow|bg-white|rounded-2xl|rounded-xl/);
});

test("needs attention cell borders create vertical and horizontal dividers dynamically", () => {
  const borderHelperBlock = blockBetween('function attentionCellBorderClass', 'function AttentionRow');
  assert.match(borderHelperBlock, /const isRightColumn = index % 2 === 1/);
  assert.match(borderHelperBlock, /const hasMobileDivider = index < total - 1/);
  assert.match(borderHelperBlock, /const hasDesktopRowDivider = index < Math\.ceil\(total \/ 2\) \* 2 - 2/);
  assert.match(borderHelperBlock, /hasMobileDivider \? "border-b border-\[#7B8794\]" : ""/);
  assert.match(borderHelperBlock, /isRightColumn \? "md:border-l" : ""/);
  assert.match(borderHelperBlock, /hasDesktopRowDivider \? "md:border-b" : "md:border-b-0"/);
  assert.match(borderHelperBlock, /"md:border-\[#7B8794\]"/);
});

test("needs attention empty state keeps the outline without internal grid dividers", () => {
  const attentionBlock = blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"');
  const emptyStateBlock = blockBetween('data-admin-home-attention-heading="empty-state"', 'data-admin-home-section="at-a-glance"');
  assert.match(emptyStateBlock, /data-admin-home-attention-heading="empty-state"/);
  assert.match(emptyStateBlock, /No urgent issues require attention\./);
  assert.doesNotMatch(emptyStateBlock, /data-admin-home-attention-rail="outlined-grid"|md:border-l|md:border-b|border-b border-\[#7B8794\]/);
  assert.match(attentionBlock, /data-admin-home-attention-outline="true"/);
});

test("at a glance uses one outlined metric grid with the heading inside the outline", () => {
  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  const outlineIndex = glanceBlock.indexOf('data-admin-home-glance-outline="true"');
  const headingIndex = glanceBlock.indexOf('<SectionHeading id="at-a-glance-heading">At a Glance</SectionHeading>');
  const gridIndex = glanceBlock.indexOf('data-admin-home-glance-grid="outlined"');

  assert.notEqual(outlineIndex, -1);
  assert.ok(headingIndex > outlineIndex, "heading should be inside the outline");
  assert.ok(gridIndex > headingIndex, "heading should be above the metric grid");
  assert.match(glanceBlock, /data-admin-home-glance-outline="true" className="overflow-hidden rounded-none border border-\[#7B8794\] bg-transparent"/);
  assert.match(glanceBlock, /<div className="px-5 pt-5 sm:px-6 sm:pt-6">\s*<SectionHeading id="at-a-glance-heading">At a Glance<\/SectionHeading>\s*<\/div>/);
  assert.doesNotMatch(glanceBlock, /data-admin-home-metric-item="flat"[^>]*At a Glance|data-admin-home-glance-heading-outline|border-b[^\n]*at-a-glance-heading/);
});

test("at a glance keeps six metrics in order with two columns by default and three at md", () => {
  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), ["Total users", "Active users", "Suspended users", "Admin users", "Recent searches", "Recent admin actions"]);
  assert.match(glanceBlock, /data-admin-home-glance-grid="outlined" className="mt-4 grid grid-cols-2 md:grid-cols-3"/);
  assert.doesNotMatch(glanceBlock, /xl:grid-cols-6|gap-x-6|gap-y-5|divide-x|divide-y|shadow|bg-white|rounded-2xl|rounded-xl/);
  assert.match(adminOverviewPage, /data-admin-home-metric-item="flat" className=\{`min-w-0 px-4 py-5 \$\{className\}`\}/);
});

test("at a glance metric cell borders create responsive vertical and horizontal dividers", () => {
  const glanceBlock = blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"');
  const borderHelperBlock = blockBetween('function overviewMetricCellBorderClass', 'const metricIcons');
  assert.match(glanceBlock, /className=\{overviewMetricCellBorderClass\(0\)\}/);
  assert.match(glanceBlock, /className=\{overviewMetricCellBorderClass\(5\)\}/);
  assert.match(borderHelperBlock, /const isMobileLeftColumn = index % 2 === 0/);
  assert.match(borderHelperBlock, /const isMobileLastRow = index >= 4/);
  assert.match(borderHelperBlock, /const isDesktopLastColumn = index % 3 === 2/);
  assert.match(borderHelperBlock, /const isDesktopFirstRow = index < 3/);
  assert.match(borderHelperBlock, /isMobileLeftColumn \? "border-r border-\[#7B8794\]" : ""/);
  assert.match(borderHelperBlock, /!isMobileLastRow \? "border-b border-\[#7B8794\]" : ""/);
  assert.match(borderHelperBlock, /isDesktopLastColumn \? "md:border-r-0" : "md:border-r"/);
  assert.match(borderHelperBlock, /isDesktopFirstRow \? "md:border-b" : "md:border-b-0"/);
  assert.match(borderHelperBlock, /"md:border-\[#7B8794\]"/);
});

test("search activity and service status share one borderless section with no internal structural dividers", () => {
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

test("all admin home sections other than needs attention and at a glance remain free of new structural dividers", () => {
  const withoutAttention = blockBetween('data-admin-home-workspace="single-card"', 'function HeroRouteArtwork').replace(blockBetween('data-admin-home-section="needs-attention"', 'data-admin-home-section="at-a-glance"'), "");
  const withoutOutlinedSections = withoutAttention.replace(blockBetween('data-admin-home-section="at-a-glance"', 'data-admin-home-section="operations"'), "");
  assert.doesNotMatch(withoutOutlinedSections, /border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|divide-\[#A7B2BE\]|border-\[#A7B2BE\]|border-\[#7B8794\]|border-slate-200|divide-slate-200/);
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
  assert.match(adminOverviewPage, /data-admin-home-attention-rail="outlined-grid" className="grid md:grid-cols-2"/); // Needs Attention: 390 one column, 768+ two columns; never four.
  assert.match(adminOverviewPage, /data-admin-home-glance-grid="outlined" className="mt-4 grid grid-cols-2 md:grid-cols-3"/); // At a Glance: 390 two, 768+ three.
  assert.match(adminOverviewPage, /grid gap-0 xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/); // Operations: stacked through 1024, side-by-side at 1280+.
  assert.match(adminOverviewPage, /sm:grid-cols-3/); // Search metrics: one column at 390, three by 768+.
});

test("navbar remains unchanged and no nested section cards are introduced", () => {
  assert.match(adminShell, /<header className="sticky top-0 z-30 border-b border-\[#DDE7F0\] bg-white\/95 backdrop-blur">/);
  assert.match(adminShell, /Kurioticket/);
  assert.doesNotMatch(adminOverviewPage, /AdminSectionCard|AdminMetricCard|bg-white|shadow|gradient|rounded-2xl/);
});
