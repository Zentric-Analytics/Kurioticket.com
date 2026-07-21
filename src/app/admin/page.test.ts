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

function openingTagForSurface(surface: string): string {
  const match = adminOverviewPage.match(new RegExp(`<section[^>]*data-admin-home-surface="${surface}"[^>]*>`));
  assert.ok(match, `${surface} section wrapper should exist`);
  return match[0];
}

function assertNoOuterCardClasses(openingTag: string): void {
  assert.doesNotMatch(openingTag, /bg-white/);
  assert.doesNotMatch(openingTag, /rounded-2xl/);
  assert.doesNotMatch(openingTag, /shadow/);
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


test("admin home uses a full-bleed decorative workspace background while containing the header", () => {
  assert.equal((adminOverviewPage.match(/data-admin-home-workspace="single-card"/g) || []).length, 1);
  const workspaceBlock = blockBetween('data-admin-home-workspace="single-card"', 'function HeroRouteArtwork');
  assert.match(workspaceBlock, /className="relative isolate"/);
  assert.match(workspaceBlock, /data-admin-home-workspace-background="full-bleed"/);
  assert.match(workspaceBlock, /aria-hidden="true"/);
  assert.match(workspaceBlock, /className="pointer-events-none absolute inset-y-0 left-1\/2 -z-10 w-screen -translate-x-1\/2 border-y border-\[#E4E9EF\] bg-white shadow-\[0_10px_36px_rgba\(2,28,43,0\.06\)\]"/);
  assert.match(workspaceBlock, /data-admin-home-workspace-background="full-bleed"[\s\S]*\/>[\s\S]*<div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">/);
  assert.match(workspaceBlock, /<AdminPageHeader[\s\S]*title="Admin Home"/);
  assert.match(workspaceBlock, /actions=\{<HeroRouteArtwork \/>\}/);
  assert.equal((adminOverviewPage.match(/data-admin-home-main-surface=/g) || []).length, 0);
  assert.doesNotMatch(adminOverviewPage, /adminHomeSurfaceClass/);
});


test("admin home full-bleed background does not alter content constraints or introduce a full-width content wrapper", () => {
  const workspaceBlock = blockBetween('data-admin-home-workspace="single-card"', 'function HeroRouteArtwork');
  assert.match(adminShell, /<main className="page-shell py-5 sm:py-6">/);
  assert.match(workspaceBlock, /<div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">/);
  assert.match(adminOverviewPage, /const adminHomeSectionClass = "border-t border-\[#E4E9EF\] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"/);
  assert.doesNotMatch(workspaceBlock, /max-w-none|w-full|container|mx-0|px-0/);
  assert.equal((workspaceBlock.match(/w-screen/g) || []).length, 1);
  assert.match(workspaceBlock, /data-admin-home-workspace-background="full-bleed"[\s\S]*aria-hidden="true"[\s\S]*\/>/);
});

test("admin home sections are transparent workspace regions separated by internal dividers", () => {
  assert.match(adminOverviewPage, /const adminHomeSectionClass = "border-t border-\[#E4E9EF\] px-5 py-6 sm:px-6 lg:px-8 lg:py-8"/);
  for (const section of ["needs-attention", "at-a-glance", "recent-admin-activity"]) {
    assert.match(adminOverviewPage, new RegExp(`data-admin-home-section="${section}"[^>]*className=\{adminHomeSectionClass\}`));
  }
  assert.match(adminOverviewPage, /data-admin-home-section="operations"[^>]*className="border-t border-\[#E4E9EF\]"/);
  assert.equal((adminOverviewPage.match(/data-admin-home-section=/g) || []).length, 4);
});

test("search activity and service status are flat operational sections in the single workspace", () => {
  const operationsBlock = blockBetween('data-admin-home-section="operations"', 'data-admin-home-section="recent-admin-activity"');
  assert.match(operationsBlock, /data-admin-home-operations-layout="shared"/);
  assert.match(operationsBlock, /xl:grid-cols-\[minmax\(0,1\.15fr\)_minmax\(320px,0\.85fr\)\]/);
  assert.match(operationsBlock, /data-admin-home-surface="search-activity"/);
  assert.match(operationsBlock, /data-admin-home-surface="service-status"/);
  assert.equal((operationsBlock.match(/bg-white|shadow-\[|rounded-\[/g) || []).length, 0);
  assert.match(operationsBlock, /border-t border-\[#E4E9EF\].*xl:border-l xl:border-t-0/s);
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
  const glanceBlock = blockBetween("At a Glance", "data-admin-home-section=\"operations\"");
  assert.deepEqual(labelsFor("OverviewMetric", glanceBlock), ["Total users", "Active users", "Suspended users", "Admin users", "Recent searches", "Recent admin actions"]);
  assert.match(glanceBlock, /data-admin-home-metric-rail="flat"/);
  assert.doesNotMatch(glanceBlock, /border-l-4 border-\[#6B7CFF\]/);
  assert.match(glanceBlock, /grid-cols-2/);
  assert.match(glanceBlock, /md:grid-cols-3/);
  assert.match(glanceBlock, /xl:grid-cols-6/);
  assert.match(glanceBlock, /hint="Last 7 days"/);
  assert.doesNotMatch(glanceBlock, /AdminSectionCard|AdminMetricCard/);
});

test("provider readiness large-card section is absent but providers remain represented in service status", () => {
  assert.doesNotMatch(adminOverviewPage, /<SectionHeading[^>]*>Provider Readiness<\/SectionHeading>|AdminProviderStatusCard|Operations Snapshot/);
  const serviceOpeningTag = openingTagForSurface("service-status");
  assertNoOuterCardClasses(serviceOpeningTag);
  const serviceBlock = blockBetween("data-admin-home-surface=\"service-status\"", "Recent Admin Activity");
  assert.match(serviceBlock, /providers\.map/);
  assert.match(serviceBlock, /provider\.product/);
  const adminData = readFileSync("src/lib/admin-data.ts", "utf8");
  assert.match(adminData, /product: "Flights"/);
  assert.match(adminData, /product: "Hotels"/);
  assert.match(adminData, /product: "Cars"/);
});

test("search activity has no outer card surface while preserving flat metrics, data and decorations", () => {
  const searchOpeningTag = openingTagForSurface("search-activity");
  assertNoOuterCardClasses(searchOpeningTag);
  const searchBlock = blockBetween("data-admin-home-surface=\"search-activity\"", "data-admin-home-surface=\"service-status\"");
  assert.deepEqual(labelsFor("PanelMetric", searchBlock), ["Total recent searches", "No-result searches", "Failed searches"]);
  assert.match(searchBlock, /<PanelHeading id="search-activity-heading"[^>]*>Search Activity<\/PanelHeading>/);
  assert.doesNotMatch(searchBlock, /<SectionHeading id="search-activity-heading"/);
  assert.match(searchBlock, /data-admin-home-search-metrics="icon-divider-rail"/);
  assert.match(searchBlock, /sm:divide-x/);
  assert.match(searchBlock, /icon=\{Search\}/);
  assert.match(searchBlock, /icon=\{SearchX\}/);
  assert.match(searchBlock, /icon=\{XCircle\}/);
  assert.match(adminOverviewPage, /data-admin-home-search-metric="flat-icon"/);
  assert.match(searchBlock, /data-admin-home-surface="search-activity"/);
  assert.equal((searchBlock.match(/data-admin-home-surface="search-activity"/g) || []).length, 1);
  assert.match(searchBlock, /Top products searched/);
  assert.match(searchBlock, /Search analytics unavailable/);
  assert.match(searchBlock, /href="\/admin\/searches"/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="search-route"/);
  assert.doesNotMatch(searchBlock, /AdminMetricCard|chart|rounded-2xl border border-slate-200 bg-white shadow-sm/i);
});

test("service status has no outer card surface while preserving two flat status columns and links", () => {
  const serviceOpeningTag = openingTagForSurface("service-status");
  assertNoOuterCardClasses(serviceOpeningTag);
  const serviceBlock = blockBetween("data-admin-home-surface=\"service-status\"", "Recent Admin Activity");
  assert.match(serviceBlock, /data-admin-home-surface="service-status"/);
  assert.equal((serviceBlock.match(/data-admin-home-surface="service-status"/g) || []).length, 1);
  assert.match(serviceBlock, /<PanelHeading id="service-status-heading"[^>]*>Service Status<\/PanelHeading>/);
  assert.doesNotMatch(serviceBlock, /<SectionHeading id="service-status-heading"/);
  assert.match(serviceBlock, /Provider statuses/);
  assert.match(serviceBlock, /System statuses/);
  assert.match(serviceBlock, /data-admin-home-service-groups="provider-system"/);
  assert.match(serviceBlock, /data-admin-home-service-divider="responsive"/);
  assert.match(serviceBlock, /md:w-px/);
  assert.match(serviceBlock, /h-px bg-slate-200/);
  assert.deepEqual(labelsFor("StatusRow", serviceBlock).slice(-5), ["Database", "Authentication", "Email", "Provider credentials", "Webhooks"]);
  assert.match(serviceBlock, /providerReadinessLabel\(provider\)/);
  assert.match(serviceBlock, /href="\/admin\/providers"/);
  assert.match(serviceBlock, /href="\/admin\/system"/);
  assert.match(adminOverviewPage, /data-admin-home-decoration="status-corner"/);
  assert.match(serviceBlock, /providers\.map/);
  assert.match(serviceBlock, /provider\.product/);
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


test("service status badges use non-wrapping shrink-safe spacing", () => {
  const statusRowBlock = blockBetween("function StatusRow", "const statusIcons");
  assert.match(statusRowBlock, /gap-5/);
  assert.match(statusRowBlock, /flex-1/);
  assert.match(statusRowBlock, /shrink-0 whitespace-nowrap/);
  assert.match(statusRowBlock, /<AdminStatusBadge tone=\{tone\}>\{status\}<\/AdminStatusBadge>/);
  assert.match(adminOverviewPage, /if \(provider\.searchEnabled\) return "Search ready"/);
  assert.match(adminOverviewPage, /if \(provider\.providerName === "Not connected"\) return "Not connected"/);
  assert.match(adminOverviewPage, /return "Search unavailable"/);
});

test("recent admin activity separates timeline icons from text and preserves content columns", () => {
  const timelineBlock = blockBetween("function RecentActivityList", "function TextLink");
  assert.match(timelineBlock, /grid-cols-\[2\.25rem_minmax\(0,1fr\)\]/);
  assert.match(timelineBlock, /sm:grid-cols-\[2\.25rem_minmax\(0,1fr\)_auto\]/);
  assert.match(timelineBlock, /gap-x-4/);
  assert.match(timelineBlock, /sm:gap-x-6/);
  assert.match(timelineBlock, /data-admin-home-timeline-icon-column="fixed"/);
  assert.match(timelineBlock, /className="relative flex w-9 justify-center"/);
  assert.match(timelineBlock, /absolute bottom-\[-1rem\] top-0 w-px/);
  assert.match(timelineBlock, /<p className="font-semibold text-slate-950">\{humanizeAuditAction\(item\.title\)\}<\/p>/);
  assert.match(timelineBlock, /<p className="mt-1 break-words text-slate-600">\{item\.detail\}<\/p>/);
  assert.match(timelineBlock, /<p className="col-start-2 text-xs font-semibold text-slate-500 sm:col-start-3 sm:text-right">\{item\.timestamp\}<\/p>/);
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

test("admin home applies off-white to a full-width wrapper while preserving the navbar and transparent page shell", () => {
  assert.match(adminShell, /const pathname = usePathname\(\)/);
  assert.match(adminShell, /const isAdminHome = pathname === "\/admin"/);
  assert.match(adminShell, /<div className=\{cn\(isAdminHome && "min-h-\[calc\(100vh-4rem\)\] bg-\[#F7F6F2\] sm:min-h-\[calc\(100vh-68px\)\]"\)\}>/);
  assert.doesNotMatch(adminShell, /bg-\[#E8E3DB\]/);
  assert.match(adminShell, /min-h-\[calc\(100vh-4rem\)\]/);
  assert.match(adminShell, /sm:min-h-\[calc\(100vh-68px\)\]/);
  assert.match(adminShell, /<main className="page-shell py-5 sm:py-6">/);
  assert.doesNotMatch(adminShell, /<main[^>]*bg-\[#F7F6F2\]|<main[^>]*bg-\[#E8E3DB\]/);
  assert.match(adminShell, /<header className="sticky top-0 z-30 border-b border-\[#DDE7F0\] bg-white\/95 backdrop-blur">/);
  assert.doesNotMatch(adminOverviewPage, /bg-\[#E8E3DB\]/);
});

test("other admin routes are not hard-coded to the Admin Home background colours", () => {
  const otherAdminRoutes = [
    "src/app/admin/operations/page.tsx",
    "src/app/admin/monitoring/page.tsx",
    "src/app/admin/platform/page.tsx",
  ];

  for (const route of otherAdminRoutes) {
    assert.doesNotMatch(readFileSync(route, "utf8"), /#F7F6F2|bg-\[#F7F6F2\]|#E8E3DB|bg-\[#E8E3DB\]/, `${route} should not use the Admin Home background`);
  }
});
