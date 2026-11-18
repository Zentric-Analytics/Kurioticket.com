import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = [
  "src/app/admin/settings/layout.tsx",
  "src/components/admin/SettingsFeatureSection.tsx",
].map((path) => readFileSync(path, "utf8")).join("\n");
const envSource = readFileSync("src/lib/env.ts", "utf8");
const adminDataSource = readFileSync("src/lib/admin-data.ts", "utf8");
const systemApi = readFileSync("src/app/api/admin/system/route.ts", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
const adminNav = readFileSync("src/lib/adminNavigation.ts", "utf8");

test("System Overview is a read-only summary without duplicate subsection links", () => {
  assert.match(systemPage, /title="System"/);
  assert.match(systemPage, /hideHeader/);
  const positions = ['aria-label="System summary"', ">Issues Requiring Attention</h2>", ">System areas</h2>"]
    .map(section => systemPage.indexOf(section));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);

  assert.match(systemPage, /grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4/);
  assert.match(systemPage, /systemAreaCount = serviceRows.length/);
  assert.match(systemPage, /No issues detected by these checks\./);
  for (const signal of ["Live connectivity check", "Configuration only", "CMS diagnostics", "Separate check"]) {
    assert.ok(systemPage.includes(signal), signal);
  }
  for (const area of ["database", "authentication", "email", "cms", "admin-access"]) {
    assert.ok(systemPage.includes('id: "' + area + '"'), area);
  }
  assert.match(systemPage, /Administrator email configuration missing/);
  assert.match(systemPage, /Configured administrators|administrators listed/);
  assert.match(systemPage, /adminEmailCount/);
  assert.match(systemPage, /getSafeSystemStatus\(\)/);
  assert.match(systemPage, /StatusIndicator/);
  assert.match(systemPage, /data-system-area=\{service.id\}/);
  assert.match(systemPage, /grid-cols-\[minmax\(150px,1\.15fr\)_minmax\(160px,0\.9fr\)_minmax\(180px,1\.3fr\)\]/);

  // Dedicated subsection navigation stays in the left sidebar, not this report.
  assert.doesNotMatch(systemPage, /<Link|<details|<summary|<button|<form/);
  assert.doesNotMatch(systemPage, /href:|actionLabel:|Open Email Delivery|Open CMS Health|View email diagnostics|Review provider readiness/);
  assert.doesNotMatch(systemPage, /Details<\/span>|>Details<\/span>/);
  assert.doesNotMatch(systemPage, /FeatureControlsPanel|listFeatureControls|mockHealth|fakeLatency/);
  assert.doesNotMatch(systemPage, /\/admin\/notifications|\/admin\/settings/);
  assert.match(systemPage, /system.databaseConnected/);
  assert.match(systemPage, /system.emailConfigured/);
  assert.match(systemPage, /system.adminEmailsConfigured/);
});

test("System specialist pages remain dedicated routes and appear under System workspace navigation", () => {
  assert.doesNotMatch(adminShell, /function SystemSectionTabs|aria-label="System sections"|systemSectionsVisible|systemChildren/);
  assert.match(adminShell, /<main className=\{"mx-auto w-full max-w-\[1920px\] " \+ \(isOverview/);
  assert.match(adminShell, /isOverview \? "px-4 py-5 sm:px-6 lg:px-10" : "px-4 py-5 sm:px-5 lg:px-6"/);
  assert.match(adminShell, /lg:grid-cols-\[196px_minmax\(0,1fr\)\] lg:gap-4/);
  assert.match(adminShell, /<AdminSearchContent>[\s\S]*<WorkspaceSidebar pathname=\{pathname\} role=\{role\} showPreviewTesters=\{showPreviewTesters\} \/>/);
  assert.match(adminShell, /data-admin-page-content className="min-w-0">\{children\}<\/div>/);
  assert.match(adminShell, /href: "\/admin\/logs", label: "Audit Logs"/);
  assert.match(adminShell, /auditLogsWorkspace/);

  for (const href of ["/admin/system/cms-health", "/admin/email-delivery", "/admin/logs"]) {
    assert.ok(adminNav.includes(`href: "${href}"`));
    assert.equal(adminNav.includes(`href: "${href}", parentHref: "/admin/system"`), true);
  }
  assert.match(adminNav, /href: "\/admin\/logs", parentHref: "\/admin\/system", label: "Audit Logs"/);
  assert.doesNotMatch(adminNav, /href: "\/admin\/notifications", parentHref:/);
  assert.match(adminShell, /<AdminNotificationsPanel/);
});
test("settings owns authoritative feature controls", () => {
  assert.match(settingsPage, /title="Settings"/);
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /listFeatureControls/);
  assert.match(settingsPage, /getFeatureControlProductionAdmins/);
  assert.match(settingsPage, /canControlProduction/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
});

test("deployment-owned configuration stays protected without a duplicate Settings section", () => {
  assert.doesNotMatch(settingsPage, /Managed outside Settings|Runtime & credentials|Administrator access/);
  assert.match(envSource, /getFeatureControlProductionAdmins/);
  assert.match(envSource, /export function getAdminEmails\(\)/);
  assert.match(envSource, /process\.env\.ADMIN_EMAILS \|\| ""/);
  assert.match(adminDataSource, /adminEmailsConfigured: getAdminEmails\(\)\.length > 0/);
});

test("system API remains read-only status", () => {
  assert.match(systemApi, /return NextResponse\.json\(\{ system: await getSafeSystemStatus\(\) \}\)/);
  assert.doesNotMatch(systemApi, /PATCH|POST|DELETE/);
});
