import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const envSource = readFileSync("src/lib/env.ts", "utf8");
const adminDataSource = readFileSync("src/lib/admin-data.ts", "utf8");
const systemApi = readFileSync("src/app/api/admin/system/route.ts", "utf8");
const adminShell = readFileSync("src/components/admin/AdminHorizontalShell.tsx", "utf8");
const adminNav = readFileSync("src/lib/adminNavigation.ts", "utf8");

test("system status uses a truthful snapshot-attention-services-configuration hierarchy", () => {
  assert.match(systemPage, /title="System"/);
  assert.match(systemPage, /hideHeader/);
  assert.match(systemPage, /max-w-\[980px\]/);

  const positions = [
    ">System snapshot</h2>",
    ">Issues Requiring Attention</h2>",
    ">Services</h2>",
    ">Configuration</h2>",
  ].map(section => systemPage.indexOf(section));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);

  assert.doesNotMatch(systemPage, /System Health Overview|Service Health|Configuration Readiness/);
  assert.match(systemPage, /system\.databaseConnected/);
  assert.match(systemPage, /system\.databaseConfigured/);
  assert.match(systemPage, /attention\.length/);
  assert.match(systemPage, /serviceRows\.length/);
  assert.match(systemPage, /getSafeSystemStatus\(\)/);
  assert.doesNotMatch(systemPage, /Math\.random|mockHealth|fakeLatency|overallHealthy/);

  assert.match(systemPage, /Live connectivity check/);
  assert.match(systemPage, /Configuration only/);
  assert.match(systemPage, /Dedicated diagnostics/);
  assert.match(systemPage, /this page does not duplicate or infer that state/);
  assert.match(systemPage, /<details key=\{service\.id\}/);
  assert.match(systemPage, /Open Email Delivery/);
  assert.match(systemPage, /Open Providers/);
  assert.match(systemPage, /Open CMS Health/);

  assert.match(systemPage, /Database configuration/);
  assert.match(systemPage, /Authentication configuration/);
  assert.match(systemPage, /Email credentials/);
  assert.match(systemPage, /Provider credentials/);
  assert.match(systemPage, /Administrator allowlist/);
  assert.match(systemPage, /Configured administrators/);
  assert.doesNotMatch(systemPage, /Session secret configured|No secrets shown|Database URL hidden|API keys hidden/);

  assert.match(systemPage, /system\.emailConfigured/);
  assert.match(systemPage, /system\.providerCredentialsPresent/);
  assert.match(systemPage, /system\.adminEmailsConfigured/);
  assert.doesNotMatch(systemPage, /FeatureControlsPanel|listFeatureControls|getServerSession/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard|homepage fare/i);
  assert.doesNotMatch(systemPage, /View operational alerts|Open Alerts|\/admin\/notifications/);
});

test("System child routes use the same compact horizontal navigation", () => {
  assert.match(adminShell, /function SystemSectionTabs/);
  assert.match(adminShell, /aria-label="System sections"/);
  assert.match(adminShell, /systemSectionsVisible \? <SystemSectionTabs/);
  assert.match(adminShell, /gap-6 overflow-x-auto whitespace-nowrap/);
  assert.match(adminShell, /border-b border-\[#D8E1EC\]/);
  assert.match(adminShell, /h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-1 text-\[13px\] font-medium text-\[#020617\]/);
  assert.match(adminShell, /<main className="mx-auto w-full max-w-\[1920px\]/);
  assert.match(adminShell, /\{systemSectionsVisible \? <SystemSectionTabs entries=\{systemChildren\} pathname=\{pathname\} \/> : null\}/);
  assert.doesNotMatch(adminShell, /<\/header>\s*\{systemSectionsVisible/);
  assert.match(adminShell, /border-b-2/);
  assert.match(adminShell, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(adminShell, /aria-current=\{pathname === item\.href \|\| pathname === item\.href \+ "\/" \? "page" : undefined\}/);
  assert.doesNotMatch(adminShell, /<details|<summary|group-open:rotate-180/);
  assert.match(adminShell, /entry\.item\.href === "\/admin\/system"/);
  for (const href of ["/admin/system/cms-health", "/admin/email-delivery", "/admin/logs"]) {
    assert.ok(adminNav.includes(`href: "${href}", parentHref: "/admin/system"`));
  }
  assert.doesNotMatch(adminNav, /href: "\/admin\/notifications", parentHref:/);
  assert.match(adminShell, /href="\/admin\/notifications"/);
});

test("settings owns authoritative feature controls", () => {
  assert.match(settingsPage, /title="Settings"/);
  assert.match(settingsPage, /Feature Controls/);
  assert.match(settingsPage, /FeatureControlsPanel/);
  assert.match(settingsPage, /listFeatureControls/);
  assert.match(settingsPage, /getFeatureControlProductionAdmins/);
  assert.match(settingsPage, /canControlProduction/);
  assert.match(settingsPage, /operationsAvailable=\{featureControls\.dataAvailable\}/);
  assert.doesNotMatch(settingsPage, /HomepageFaresRefreshCard/);
});

test("deployment-owned configuration stays outside Settings mutations", () => {
  assert.match(settingsPage, /Database URLs, API keys, session secrets, provider credentials and server environment variables are never editable here/);
  assert.match(settingsPage, /ADMIN_EMAILS and production feature-controller permissions stay in server configuration/);
  assert.match(envSource, /getFeatureControlProductionAdmins/);
  assert.match(envSource, /export function getAdminEmails\(\)/);
  assert.match(envSource, /process\.env\.ADMIN_EMAILS \|\| ""/);
  assert.match(adminDataSource, /adminEmailsConfigured: getAdminEmails\(\)\.length > 0/);
});

test("system API remains read-only status", () => {
  assert.match(systemApi, /return NextResponse\.json\(\{ system: await getSafeSystemStatus\(\) \}\)/);
  assert.doesNotMatch(systemApi, /PATCH|POST|DELETE/);
});
