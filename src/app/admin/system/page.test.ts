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

test("system is read-only safe runtime status", () => {
  assert.match(systemPage, /title="System"/);
  assert.match(systemPage, /hideHeader/);
  assert.match(systemPage, /max-w-\[880px\]/);
  assert.match(systemPage, /divide-y divide-slate-200/);
  assert.doesNotMatch(systemPage, /href="\/admin\/(?:logs|email-delivery)"|href="\/admin\/system\/cms-health"/);
  assert.match(systemPage, /System Status/);
  assert.match(systemPage, /Configuration Readiness/);
  assert.match(systemPage, /Database connectivity/);
  assert.match(systemPage, /Authentication configuration/);
  assert.doesNotMatch(systemPage, /Session secret configured|No secrets shown|Database URL hidden|API keys hidden/);
  assert.match(systemPage, /system\.emailConfigured/);
  assert.match(systemPage, /system\.providerCredentialsPresent/);
  assert.match(systemPage, /Configuration Readiness/);
  assert.match(systemPage, /ADMIN_EMAILS configured/);
  assert.match(systemPage, /Configured admin count/);
  assert.doesNotMatch(systemPage, /FeatureControlsPanel|listFeatureControls|getServerSession/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard|homepage fare/i);
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
  for (const href of ["/admin/system/cms-health", "/admin/email-delivery", "/admin/logs", "/admin/notifications"]) {
    assert.ok(adminNav.includes(`href: "${href}", parentHref: "/admin/system"`));
  }
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
