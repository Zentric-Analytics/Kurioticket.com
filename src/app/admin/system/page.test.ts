import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const envSource = readFileSync("src/lib/env.ts", "utf8");
const adminDataSource = readFileSync("src/lib/admin-data.ts", "utf8");
const systemApi = readFileSync("src/app/api/admin/system/route.ts", "utf8");

test("system is read-only safe runtime status", () => {
  assert.match(systemPage, /title="System"/);
  assert.match(systemPage, /Safe operational status only/);
  assert.match(systemPage, /System Status/);
  assert.match(systemPage, /Admin Configuration/);
  assert.match(systemPage, /ADMIN_EMAILS configured/);
  assert.match(systemPage, /Configured admin count/);
  assert.doesNotMatch(systemPage, /FeatureControlsPanel|listFeatureControls|getServerSession/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard|homepage fare/i);
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
