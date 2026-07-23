import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminOverviewPage = readFileSync("src/app/admin/page.tsx", "utf8");
const adminShell = readFileSync(
  "src/components/admin/AdminPageShell.tsx",
  "utf8",
);

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

function sectionOpening(section: string): string {
  const match = adminOverviewPage.match(
    new RegExp(`<section[^>]*data-admin-home-section="${section}"[^>]*>`),
  );
  assert.ok(match, `${section} section should exist`);
  return match[0];
}

test("admin home creates exactly five sections in the requested order", () => {
  assert.deepEqual(
    Array.from(
      adminOverviewPage.matchAll(/data-admin-home-section="([^"]+)"/g),
      (match) => match[1],
    ),
    [
      "header",
      "needs-attention",
      "at-a-glance",
      "operations",
      "recent-admin-activity",
    ],
  );

  for (const section of [
    "header",
    "needs-attention",
    "at-a-glance",
    "operations",
    "recent-admin-activity",
  ]) {
    assert.match(
      sectionOpening(section),
      /className=\{adminHomeSectionClass\}/,
    );
  }

  assert.match(
    adminOverviewPage,
    /const adminHomeSectionClass =\s*"bg-transparent px-5 py-6 sm:px-6 lg:px-8 lg:py-8"/,
  );
  assert.match(
    adminOverviewPage,
    /className="relative isolate grid gap-5 md:gap-6 xl:gap-7"/,
  );
});

test("full-bleed workspace background keeps #F7F6F2 and has no border or shadow", () => {
  const workspaceBlock = blockBetween(
    'data-admin-home-workspace="single-card"',
    "function HeroRouteArtwork",
  );
  assert.match(
    workspaceBlock,
    /data-admin-home-workspace-background="full-bleed"/,
  );
  assert.match(
    workspaceBlock,
    /className="pointer-events-none absolute inset-y-0 left-1\/2 -z-10 w-screen -translate-x-1\/2 bg-\[#F7F6F2\]"/,
  );
  const backgroundOpening = blockBetween(
    'data-admin-home-workspace-background="full-bleed"',
    'data-admin-home-section="header"',
  );
  assert.doesNotMatch(
    backgroundOpening,
    /border-y|border-t|border-b|shadow-\[/,
  );
  assert.match(
    adminShell,
    /isAdminHome && "min-h-\[calc\(100vh-4rem\)\] bg-\[#F7F6F2\] sm:min-h-\[calc\(100vh-68px\)\]"/,
  );
});

test("header section preserves the Admin Home header content and artwork", () => {
  const headerBlock = blockBetween(
    'data-admin-home-section="header"',
    'data-admin-home-section="needs-attention"',
  );
  assert.match(headerBlock, /<AdminPageHeader/);
  assert.match(headerBlock, /title="Admin Home"/);
  assert.match(headerBlock, /titleId="admin-home-heading"/);
  assert.match(
    headerBlock,
    /Monitor Kurioticket activity, provider readiness, search health, system status and recent administrative actions\./,
  );
  assert.match(headerBlock, /actions=\{<HeroRouteArtwork \/>\}/);
  assert.doesNotMatch(
    headerBlock,
    /border-t|border-b|border-y|divide-x|divide-y/,
  );
});

test("needs attention uses one outlined responsive grid without card styling", () => {
  const attentionBlock = blockBetween(
    'data-admin-home-section="needs-attention"',
    'data-admin-home-section="at-a-glance"',
  );
  assert.match(
    attentionBlock,
    /data-admin-home-attention-outline="true"[\s\S]*?className="overflow-hidden rounded-none border border-\[#7B8794\] bg-transparent"/,
  );
  assert.match(
    attentionBlock,
    /data-admin-home-attention-rail="outlined-grid"[\s\S]*?className="mt-6 grid md:grid-cols-2"/,
  );
  assert.doesNotMatch(attentionBlock, /xl:grid-cols-4/);
  assert.match(attentionBlock, /attentionIssues\.map\(\(issue, index\) =>/);
  assert.doesNotMatch(attentionBlock, /\n\s+heading=|index === 0|data-admin-home-attention-heading="in-first-cell"/);
  assert.match(
    attentionBlock,
    /data-admin-home-attention-heading="section-header"[\s\S]*?className="px-5 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8"/,
  );
  assert.match(
    attentionBlock,
    /aria-label=\{`\$\{attentionIssues.length\} issues`\}/,
  );
  assert.doesNotMatch(
    attentionBlock,
    /data-admin-home-attention-heading-row|border-b[^\n]*needs-attention-heading/,
  );
  assert.match(
    adminOverviewPage,
    /data-admin-home-attention-item="outlined-grid-cell"[\s\S]*?className=\{`min-w-0 p-5 sm:p-6 \$\{className\}`\}/,
  );
  assert.doesNotMatch(
    attentionBlock,
    /data-admin-home-attention-item="card"|shadow|bg-white|rounded-2xl|rounded-xl/,
  );
});

test("needs attention cell borders create vertical and horizontal dividers dynamically", () => {
  const borderHelperBlock = blockBetween(
    "function attentionCellBorderClass",
    "function AttentionRow",
  );
  assert.match(borderHelperBlock, /const isRightColumn = index % 2 === 1/);
  assert.match(borderHelperBlock, /const hasMobileDivider = index < total - 1/);
  assert.match(
    borderHelperBlock,
    /const hasDesktopRowDivider = index < Math\.ceil\(total \/ 2\) \* 2 - 2/,
  );
  assert.match(
    borderHelperBlock,
    /hasMobileDivider \? "border-b border-\[#7B8794\]" : ""/,
  );
  assert.match(borderHelperBlock, /isRightColumn \? "md:border-l" : ""/);
  assert.match(
    borderHelperBlock,
    /hasDesktopRowDivider \? "md:border-b" : "md:border-b-0"/,
  );
  assert.match(borderHelperBlock, /"md:border-\[#7B8794\]"/);
});

test("needs attention empty state keeps the outline without internal grid dividers", () => {
  const attentionBlock = blockBetween(
    'data-admin-home-section="needs-attention"',
    'data-admin-home-section="at-a-glance"',
  );
  const emptyStateBlock = blockBetween(
    ') : (',
    'data-admin-home-section="at-a-glance"',
  );
  assert.match(
    attentionBlock,
    /data-admin-home-attention-heading="section-header"/,
  );
  assert.match(emptyStateBlock, /No urgent issues require attention\./);
  assert.doesNotMatch(
    emptyStateBlock,
    /data-admin-home-attention-rail="outlined-grid"|md:border-l|md:border-b|border-b border-\[#7B8794\]/,
  );
  assert.match(attentionBlock, /data-admin-home-attention-outline="true"/);
});

test("at a glance uses one outlined metric grid with the heading inside the outline", () => {
  const glanceBlock = blockBetween(
    'data-admin-home-section="at-a-glance"',
    'data-admin-home-section="operations"',
  );
  const outlineIndex = glanceBlock.indexOf(
    'data-admin-home-glance-outline="true"',
  );
  const headingIndex = glanceBlock.indexOf(
    '<SectionHeading id="at-a-glance-heading">',
  );
  const gridIndex = glanceBlock.indexOf(
    'data-admin-home-glance-grid="outlined"',
  );

  assert.notEqual(outlineIndex, -1);
  assert.ok(
    headingIndex > outlineIndex,
    "heading should be inside the outline",
  );
  assert.ok(
    gridIndex > headingIndex,
    "heading should be above the metric grid",
  );
  assert.match(
    glanceBlock,
    /data-admin-home-glance-outline="true"[\s\S]*?className="overflow-hidden rounded-none border border-\[#7B8794\] bg-transparent"/,
  );
  assert.match(
    glanceBlock,
    /data-admin-home-glance-heading="section-header"[\s\S]*?className="px-5 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8"[\s\S]*?<SectionHeading id="at-a-glance-heading">[\s\S]*?At a Glance[\s\S]*?<\/SectionHeading>/,
  );
  assert.doesNotMatch(
    glanceBlock,
    /data-admin-home-metric-item="flat"[^>]*At a Glance|data-admin-home-glance-heading-outline|border-b[^\n]*at-a-glance-heading/,
  );
});

test("at a glance keeps six metrics in order with two columns by default and three at md", () => {
  const glanceBlock = blockBetween(
    'data-admin-home-section="at-a-glance"',
    'data-admin-home-section="operations"',
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
    /data-admin-home-glance-grid="outlined"[\s\S]*?className="mt-6 grid grid-cols-2 md:grid-cols-3"/,
  );
  assert.doesNotMatch(
    glanceBlock,
    /xl:grid-cols-6|gap-x-6|gap-y-5|divide-x|divide-y|shadow|bg-white|rounded-2xl|rounded-xl/,
  );
  assert.match(
    adminOverviewPage,
    /data-admin-home-metric-item="flat"[\s\S]*?className=\{`min-w-0 px-4 py-5 \$\{className\}`\}/,
  );
});

test("at a glance metric cell borders create responsive vertical and horizontal dividers", () => {
  const glanceBlock = blockBetween(
    'data-admin-home-section="at-a-glance"',
    'data-admin-home-section="operations"',
  );
  const borderHelperBlock = blockBetween(
    "function overviewMetricCellBorderClass",
    "const metricIcons",
  );
  assert.match(glanceBlock, /className=\{overviewMetricCellBorderClass\(0\)\}/);
  assert.match(glanceBlock, /className=\{overviewMetricCellBorderClass\(5\)\}/);
  assert.match(borderHelperBlock, /const isMobileLeftColumn = index % 2 === 0/);
  assert.match(borderHelperBlock, /const isMobileLastRow = index >= 4/);
  assert.match(
    borderHelperBlock,
    /const isDesktopLastColumn = index % 3 === 2/,
  );
  assert.match(borderHelperBlock, /const isDesktopFirstRow = index < 3/);
  assert.match(
    borderHelperBlock,
    /isMobileLeftColumn \? "border-r border-\[#7B8794\]" : ""/,
  );
  assert.match(
    borderHelperBlock,
    /!isMobileLastRow \? "border-b border-\[#7B8794\]" : ""/,
  );
  assert.match(
    borderHelperBlock,
    /isDesktopLastColumn \? "md:border-r-0" : "md:border-r"/,
  );
  assert.match(
    borderHelperBlock,
    /isDesktopFirstRow \? "md:border-b" : "md:border-b-0"/,
  );
  assert.match(borderHelperBlock, /"md:border-\[#7B8794\]"/);
});

test("search activity uses one complete outlined rectangle with heading and lower content inside", () => {
  const operationsBlock = blockBetween(
    'data-admin-home-section="operations"',
    'data-admin-home-section="recent-admin-activity"',
  );
  const searchBlock = blockBetween(
    'data-admin-home-surface="search-activity"',
    'data-admin-home-surface="service-status"',
  );
  const outlineIndex = searchBlock.indexOf(
    'data-admin-home-surface="search-activity"',
  );
  const headingIndex = searchBlock.indexOf(
    '<PanelHeading id="search-activity-heading" icon={Activity}>',
  );
  const metricsIndex = searchBlock.indexOf(
    'data-admin-home-search-metrics="outlined-grid"',
  );
  const lowerIndex = searchBlock.indexOf(
    'data-admin-home-search-lower="products-link"',
  );
  const linkIndex = searchBlock.indexOf('href="/admin/searches"');

  assert.match(
    adminOverviewPage,
    /<section[\s\S]*?aria-label="Search Activity and Service Status"[\s\S]*?data-admin-home-section="operations"[\s\S]*?className=\{adminHomeSectionClass\}/,
  );
  assert.match(operationsBlock, /data-admin-home-operations-layout="shared"/);
  assert.match(
    operationsBlock,
    /xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/,
  );
  assert.match(
    searchBlock,
    /data-admin-home-surface="search-activity"[\s\S]*?className="relative min-h-\[17rem\] overflow-hidden rounded-none border border-\[#7B8794\] bg-transparent"/,
  );
  assert.ok(
    headingIndex > outlineIndex,
    "heading should remain inside the outline",
  );
  assert.ok(
    metricsIndex > headingIndex,
    "metrics should sit below the heading",
  );
  assert.ok(
    lowerIndex > metricsIndex,
    "lower content should sit below metrics",
  );
  assert.ok(
    linkIndex > lowerIndex,
    "View Searches should remain inside lower outlined area",
  );
  assert.match(searchBlock, /Top products searched/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="search-route"/);
  assert.match(
    adminOverviewPage,
    /data-admin-home-decoration="search-route"[\s\S]*?aria-hidden="true"/,
  );
  assert.match(adminOverviewPage, /pointer-events-none absolute inset-0/);
  assert.match(adminOverviewPage, /opacity-35/);
});

test("search activity metric grid has responsive dividers and preserves metric order", () => {
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
    /data-admin-home-search-metrics="outlined-grid"[\s\S]*?className="mt-6 grid grid-cols-1 sm:grid-cols-3"/,
  );
  assert.match(searchBlock, /className=\{searchMetricBorderClass\(0\)\}/);
  assert.match(searchBlock, /className=\{searchMetricBorderClass\(1\)\}/);
  assert.match(searchBlock, /className=\{searchMetricBorderClass\(2\)\}/);
  assert.match(
    borderHelperBlock,
    /index < 2 \? "border-b border-\[#7B8794\]" : ""/,
  );
  assert.match(borderHelperBlock, /index < 2 \? "sm:border-r" : ""/);
  assert.match(borderHelperBlock, /"sm:border-b-0 sm:border-\[#7B8794\]"/);
  assert.match(
    searchBlock,
    /data-admin-home-search-lower="products-link"[\s\S]*?className="border-t border-\[#7B8794\] px-5 py-5 sm:px-6 lg:px-8"/,
  );
  assert.doesNotMatch(
    searchBlock,
    /data-admin-home-search-metrics="icon-divider-rail"|gap-x-6|gap-y-5|divide-x|divide-y/,
  );
});

test("service status has a borderless parent with two independent outlined groups", () => {
  const operationsOpening = sectionOpening("operations");
  const operationsLayout = blockBetween(
    'data-admin-home-operations-layout="shared"',
    'data-admin-home-surface="search-activity"',
  );
  const serviceBlock = blockBetween(
    'data-admin-home-surface="service-status"',
    'data-admin-home-section="recent-admin-activity"',
  );
  const serviceOpening = blockBetween(
    'data-admin-home-surface="service-status"',
    '<ServicePanelDecoration />',
  );
  const providerBlock = blockBetween(
    'data-admin-home-provider-status-outline="true"',
    'data-admin-home-system-status-outline="true"',
  );
  const systemBlock = blockBetween(
    'data-admin-home-system-status-outline="true"',
    'data-admin-home-section="recent-admin-activity"',
  );

  assert.match(operationsOpening, /className=\{adminHomeSectionClass\}/);
  assert.doesNotMatch(
    operationsOpening,
    /border|divide|shadow|bg-white|rounded/,
  );
  assert.match(
    operationsLayout,
    /className="grid gap-0 xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]"/,
  );
  assert.doesNotMatch(
    operationsLayout,
    /border|divide|shadow|bg-white|rounded/,
  );
  assert.match(
    serviceOpening,
    /className="relative min-h-\[17rem\] overflow-hidden"/,
  );
  assert.doesNotMatch(serviceOpening, /border|divide|shadow|bg-white|rounded/);
  assert.match(
    serviceBlock,
    /data-admin-home-service-heading="section-header"[\s\S]*?className="px-5 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8"[\s\S]*?<PanelHeading id="service-status-heading" icon=\{Gauge\}>Service Status<\/PanelHeading>[\s\S]*?data-admin-home-service-groups="provider-system"/,
  );
  assert.match(
    serviceBlock,
    /className="mt-6 px-5 pb-6 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8"[\s\S]*?data-admin-home-service-groups="provider-system"[\s\S]*?className="grid gap-5 md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(0,1\.1fr\)\] md:gap-6"/,
  );
  assert.match(
    providerBlock,
    /className="min-w-0 border border-\[#7B8794\] bg-transparent p-5 sm:p-6 rounded-none"/,
  );
  assert.match(providerBlock, /Provider statuses/);
  assert.match(providerBlock, /providers\.map\(\(provider\) =>/);
  assert.match(providerBlock, /href="\/admin\/providers"/);
  assert.match(
    systemBlock,
    /className="min-w-0 border border-\[#7B8794\] bg-transparent p-5 sm:p-6 rounded-none"/,
  );
  assert.match(systemBlock, /System statuses/);
  assert.deepEqual(labelsFor("StatusRow", systemBlock), [
    "Database",
    "Authentication",
    "Email",
    "Provider credentials",
    "Webhooks",
  ]);
  assert.match(systemBlock, /href="\/admin\/system"/);
  assert.doesNotMatch(serviceBlock, /data-admin-home-service-divider|divide-x|border-l/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="status-routes"/);
});

test("recent admin activity uses spacing, not row borders or a timeline connecting line", () => {
  const activityBlock = blockBetween(
    'data-admin-home-section="recent-admin-activity"',
    "function HeroRouteArtwork",
  );
  const timelineBlock = blockBetween(
    "function RecentActivityList",
    "function TextLink",
  );
  assert.match(activityBlock, /Recent Admin Activity/);
  assert.match(activityBlock, /href="\/admin\/logs"/);
  assert.match(timelineBlock, /data-admin-home-timeline="true"/);
  assert.match(timelineBlock, /className="space-y-5"/);
  assert.match(timelineBlock, /grid-cols-\[2\.25rem_minmax\(0,1fr\)\]/);
  assert.match(timelineBlock, /sm:grid-cols-\[2\.25rem_minmax\(0,1fr\)_auto\]/);
  assert.doesNotMatch(
    timelineBlock,
    /border-y|border-b|last:border-b-0|bottom-\[-1rem\]|top-0 w-px|bg-\[#004BB8\]\/25/,
  );
});

test("admin home sections outside the intentionally outlined areas remain free of new structural dividers", () => {
  const withoutAttention = blockBetween(
    'data-admin-home-workspace="single-card"',
    "function HeroRouteArtwork",
  ).replace(
    blockBetween(
      'data-admin-home-section="needs-attention"',
      'data-admin-home-section="at-a-glance"',
    ),
    "",
  );
  const withoutGlance = withoutAttention.replace(
    blockBetween(
      'data-admin-home-section="at-a-glance"',
      'data-admin-home-section="operations"',
    ),
    "",
  );
  const withoutOutlinedSections = withoutGlance.replace(
    blockBetween(
      'data-admin-home-section="operations"',
      'data-admin-home-section="recent-admin-activity"',
    ),
    "",
  );
  assert.doesNotMatch(
    withoutOutlinedSections,
    /border-t|border-b|border-y|border-l|border-r|divide-x|divide-y|divide-\[#A7B2BE\]|border-\[#A7B2BE\]|border-\[#7B8794\]|border-slate-200|divide-slate-200/,
  );
});

test("required data, links, icons, badges, and presentation-only labels are preserved", () => {
  assert.match(
    adminOverviewPage,
    /const attentionIssues = getAttentionIssues\(providers, system, searchHealth\)/,
  );
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
  assert.match(
    adminOverviewPage,
    /<AdminStatusBadge tone=\{tone\}>\{status\}<\/AdminStatusBadge>/,
  );
  assert.match(adminOverviewPage, /humanizeAuditAction\(item\.title\)/);
  assert.match(
    adminOverviewPage,
    /HOMEPAGE_FARES_REFRESHED: "Homepage fares refreshed"/,
  );
});

test("responsive layout breakpoints remain aligned to the requested widths", () => {
  assert.match(adminOverviewPage, /gap-5 md:gap-6 xl:gap-7/); // 390px uses base gap; 768px uses md; 1280px and 1440px use xl.
  assert.match(
    adminOverviewPage,
    /data-admin-home-attention-rail="outlined-grid"[\s\S]*?className="mt-6 grid md:grid-cols-2"/,
  ); // Needs Attention: 390 one column, 768+ two columns; never four.
  assert.match(
    adminOverviewPage,
    /data-admin-home-glance-grid="outlined"[\s\S]*?className="mt-6 grid grid-cols-2 md:grid-cols-3"/,
  ); // At a Glance: 390 two, 768+ three.
  assert.match(
    adminOverviewPage,
    /grid gap-0 xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/,
  ); // Operations: stacked through 1024, side-by-side at 1280+.
  assert.match(
    adminOverviewPage,
    /data-admin-home-search-metrics="outlined-grid"[\s\S]*?className="mt-6 grid grid-cols-1 sm:grid-cols-3"/,
  ); // Search metrics: one column at 390, three by 768+.
});

test("navbar remains unchanged and no nested section cards are introduced", () => {
  assert.match(
    adminShell,
    /<header className="sticky top-0 z-30 border-b border-\[#DDE7F0\] bg-white\/95 backdrop-blur">/,
  );
  assert.match(adminShell, /Kurioticket/);
  assert.doesNotMatch(
    adminOverviewPage,
    /AdminSectionCard|AdminMetricCard|bg-white|shadow|gradient|rounded-2xl/,
  );
});
