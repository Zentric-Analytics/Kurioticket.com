import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) => readFileSync(path, "utf8");

test("Notifications belongs to the Settings sidebar without duplicate global Alerts navigation", () => {
  const nav = source("src/lib/adminNavigation.ts");
  const settingsNav = source("src/components/admin/AdminSettingsNavigation.tsx");
  assert.doesNotMatch(nav, /href: "\/admin\/notifications"/);
  assert.match(settingsNav, /href: "\/admin\/settings\/notifications"/);
});
test("System removes general Alerts shortcuts and circular configuration investigation", () => {
  const page = source("src/app/admin/system/page.tsx");
  assert.doesNotMatch(page, /View operational alerts|Open Alerts|\/admin\/notifications|\/admin\/settings/);
  assert.match(page, /Issues Requiring Attention/);
  assert.match(page, /href: "\/admin\/email-delivery"/);
  assert.match(page, /href: "\/admin\/providers"/);
  assert.match(page, /Review provider readiness/);
  assert.doesNotMatch(page, /id: "providers"|Open Providers/);
  assert.match(page, /Managed in deployment configuration/);
});
test("System diagnostic subpages keep a simple return path without restoring removed header shortcuts", () => {
  for (const path of ["src/app/admin/system/cms-health/page.tsx", "src/app/admin/email-delivery/page.tsx"]) {
    const page = source(path);
    assert.match(page, /href="\/admin\/system"/);
    assert.match(page, /Back to System/);
    assert.match(page, /ArrowLeft size=\{14\}/);
    assert.doesNotMatch(page, /actions=\{|View audit logs|href="\/admin\/logs"/);
  }
  const alerts = source("src/app/admin/notifications/page.tsx");
  assert.doesNotMatch(alerts, /actions=\{|Back to System|View audit logs|href="\/admin\/logs"|href="\/admin\/system"/);
  const settings = source("src/app/admin/settings/recent-changes/page.tsx");
  assert.doesNotMatch(settings, /actions=\{|Back to System|href="\/admin\/system"/);
  assert.match(settings, /href="\/admin\/logs\?range=90d"/);
  assert.doesNotMatch(settings, /href="\/admin\/logs\?[^"]*(action=|targetType=)/);
});
test("Settings retains feature controls without owning flight fare operations", () => {
  const page = source("src/components/admin/SettingsFeatureSection.tsx");
  assert.doesNotMatch(page, /linkLabel|View system status|View admin configuration status/);
  assert.match(page, /FeatureControlsPanel/);
  assert.doesNotMatch(page, /Homepage Fare Operations|href="\/admin\/homepage-fares"/);
  assert.match(page, /canControlProduction/);
});
test("useful actions, access guards, emergency checks and the global bell remain intact", () => {
  assert.match(source("src/app/admin/system/cms-health/page.tsx"), /CmsScopeHealthRow/);
  assert.match(source("src/components/admin/CmsScopeHealthRow.tsx"), /CmsScopeHardeningActions/);
  assert.match(source("src/app/admin/email-delivery/page.tsx"), /EmailDeliveryTestButton enabled=\{sendingReady\}/);
  const alerts = source("src/app/admin/settings/notifications/page.tsx");
  const legacy = source("src/app/admin/notifications/page.tsx");
  assert.match(alerts, /requireAdminSession\("\/admin\/settings\/notifications"\)/);
  assert.match(alerts, /isProtectedAdminEmail/);
  assert.match(alerts, /getCurrentDatabaseOutageAdminToken/);
  assert.match(alerts, /AdminAlertAcknowledgeButton/);
  assert.match(alerts, /alertSourceHref\(alert\.actionHref\)/);
  assert.match(legacy, /redirect\("\/admin\/settings\/notifications"\)/);
  assert.match(source("src/components/admin/AdminHorizontalShell.tsx"), /<AdminNotificationsPanel/);
  assert.match(source("src/components/admin/AdminNotificationsPanel.tsx"), /unreadCount/);
});
