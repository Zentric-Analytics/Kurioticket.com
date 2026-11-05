import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) => readFileSync(path, "utf8");

test("Alerts remains registered but is not a System child destination", () => {
  const nav = source("src/lib/adminNavigation.ts");
  const alert = nav.split("\n").find(line => line.includes('href: "/admin/notifications"'))!;
  assert.ok(alert); assert.doesNotMatch(alert, /parentHref/); assert.match(alert, /roles: \["ADMIN"\]/);
});
test("System removes general Alerts shortcuts and circular configuration investigation", () => {
  const page = source("src/app/admin/system/page.tsx");
  assert.doesNotMatch(page, /View operational alerts|Open Alerts|\/admin\/notifications|\/admin\/settings/);
  assert.match(page, /Issues Requiring Attention/);
  assert.match(page, /href: "\/admin\/email-delivery"/);
  assert.match(page, /href: "\/admin\/providers"/);
  assert.match(page, /Managed in deployment configuration/);
});
test("page headers no longer repeat System and Logs navigation", () => {
  for (const path of ["src/app/admin/system/cms-health/page.tsx", "src/app/admin/email-delivery/page.tsx", "src/app/admin/notifications/page.tsx", "src/app/admin/settings/page.tsx"]) {
    const page = source(path);
    assert.doesNotMatch(page, /actions=\{|Back to System|View audit logs|href="\/admin\/logs"|href="\/admin\/system"/);
  }
});
test("Settings retains feature controls without owning flight fare operations", () => {
  const page = source("src/app/admin/settings/page.tsx");
  assert.doesNotMatch(page, /linkLabel|View system status|View admin configuration status/);
  assert.match(page, /FeatureControlsPanel/);
  assert.doesNotMatch(page, /Homepage Fare Operations|href="\/admin\/homepage-fares"/);
  assert.match(page, /canControlProduction/);
});
test("useful actions, access guards, emergency checks and the global bell remain intact", () => {
  assert.match(source("src/app/admin/system/cms-health/page.tsx"), /CmsScopeHardeningActions/);
  assert.match(source("src/app/admin/email-delivery/page.tsx"), /EmailDeliveryTestButton enabled=\{sendingReady\}/);
  const alerts = source("src/app/admin/notifications/page.tsx");
  assert.match(alerts, /requireAdminSession\("\/admin\/notifications"\)/);
  assert.match(alerts, /isProtectedAdminEmail/);
  assert.match(alerts, /getCurrentDatabaseOutageAdminToken/);
  assert.match(alerts, /AdminAlertAcknowledgeButton/);
  assert.match(alerts, /alertSourceHref\(alert\.actionHref\)/);
  assert.match(source("src/components/admin/AdminHorizontalShell.tsx"), /<AdminNotificationsPanel/);
  assert.match(source("src/components/admin/AdminNotificationsPanel.tsx"), /unreadCount/);
});
