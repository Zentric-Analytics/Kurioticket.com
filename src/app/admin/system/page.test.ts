import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const systemPage = readFileSync("src/app/admin/system/page.tsx", "utf8");
const settingsPage = readFileSync("src/app/admin/settings/page.tsx", "utf8");
const envSource = readFileSync("src/lib/env.ts", "utf8");
const adminDataSource = readFileSync("src/lib/admin-data.ts", "utf8");
const systemApi = readFileSync("src/app/api/admin/system/route.ts", "utf8");
const homepageFareStatusApi = readFileSync("src/app/api/admin/homepage-fares/status/route.ts", "utf8");
const homepageFareRefreshApi = readFileSync("src/app/api/admin/homepage-fares/refresh/route.ts", "utf8");

test("settings route redirects to system without rendering duplicate UI", () => {
  assert.match(settingsPage, /import \{ redirect \} from "next\/navigation"/);
  assert.match(settingsPage, /redirect\("\/admin\/system"\)/);
  assert.doesNotMatch(settingsPage, /AdminPageShell/);
  assert.doesNotMatch(settingsPage, /Feature Flags/);
});

test("system page owns admin configuration and read-only feature flag visibility", () => {
  assert.match(systemPage, /title="System"/);
  assert.match(systemPage, /System Status/);
  assert.match(systemPage, /Admin Configuration/);
  assert.match(systemPage, /ADMIN_EMAILS configured/);
  assert.match(systemPage, /Configured admin count/);
  assert.match(systemPage, /Feature Flags/);
  assert.match(systemPage, /No feature flags configured yet\./);
  assert.match(systemPage, /flag\.enabled \? "Enabled" : "Disabled"/);
  assert.doesNotMatch(systemPage, /type="checkbox"|Switch|toggle|onClick|server action/i);
});

test("system page avoids duplicate admin email status rows", () => {
  assert.equal((systemPage.match(/ADMIN_EMAILS configured/g) || []).length, 1);
  assert.equal((systemPage.match(/Configured admin count/g) || []).length, 1);
  assert.doesNotMatch(systemPage, /\["Admin emails configured"/);
});

test("feature flag query and configuration helpers remain unchanged", () => {
  assert.match(systemPage, /db\.featureFlag\.findMany\(\{ orderBy: \{ key: "asc" \}, take: 50 \}\)/);
  assert.match(envSource, /export function getAdminEmails\(\)/);
  assert.match(envSource, /process\.env\.ADMIN_EMAILS \|\| ""/);
  assert.match(adminDataSource, /export async function getSafeSystemStatus\(\)/);
  assert.match(adminDataSource, /adminEmailsConfigured: getAdminEmails\(\)\.length > 0/);
});

test("admin APIs and homepage fare refresh APIs are not modified by system consolidation", () => {
  assert.match(systemApi, /return NextResponse\.json\(\{ system: await getSafeSystemStatus\(\) \}\)/);
  assert.match(homepageFareStatusApi, /readHomepageFareSnapshotStatus\(\)/);
  assert.match(homepageFareRefreshApi, /refreshPhase3AHomepageFareSnapshots/);
  assert.match(homepageFareRefreshApi, /writeAdminAuditLog/);
  assert.doesNotMatch(systemPage, /HomepageFaresRefreshCard/);
  assert.doesNotMatch(systemPage, /homepage fare/i);
});
