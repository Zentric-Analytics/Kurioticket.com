import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settings = readFileSync("src/app/admin/settings/notifications/page.tsx", "utf8");
const legacy = readFileSync("src/app/admin/notifications/page.tsx", "utf8");
const drawer = readFileSync("src/components/admin/AdminNotificationsPanel.tsx", "utf8");
const api = readFileSync("src/app/api/admin/notification-preferences/route.ts", "utf8");
const service = readFileSync("src/services/adminNotificationPreferencesService.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261106000000_admin_notification_preferences/migration.sql", "utf8");

test("Settings Notifications now owns the complete protected operational alert center", () => {
  assert.match(settings, /await requireAdminSession\("\/admin\/settings\/notifications"\)/);
  assert.match(settings, /isProtectedAdminEmail\(session\.user\.email\)/);
  assert.match(settings, /getCurrentDatabaseOutageAdminToken\("\/admin\/settings\/notifications"\)/);
  assert.match(settings, /getDatabaseOutageAlertSnapshot\(\)/);
  assert.match(settings, /getAdminAlertSnapshot\(session\.user\.id\)/);
  assert.match(settings, /<h2 id="settings-section-title"/);
  assert.match(settings, /<ul aria-label="Operational alerts"/);
  assert.match(settings, /<AdminAlertAcknowledgeButton/);
  assert.match(settings, /View acknowledgement history/);
  assert.doesNotMatch(settings, /Show acknowledged warnings|AdminNotificationPreferencesPanel|readAdminNotificationPreferences/);
});

test("legacy admin Alerts route remains guarded and redirects to Settings Notifications", () => {
  assert.match(legacy, /await requireAdminSession\("\/admin\/notifications"\)/);
  assert.match(legacy, /isProtectedAdminEmail\(session\.user\.email\)/);
  assert.match(legacy, /redirect\("\/admin\/settings\/notifications"\)/);
  assert.doesNotMatch(legacy, /getAdminAlertSnapshot|<AdminAlertAcknowledgeButton|AdminPageShell/);
});

test("bell drawer lists all active alerts and keeps canonical unread counts and acknowledgement", () => {
  assert.match(drawer, /const visibleAlerts = snapshot\?\.alerts \?\? \[\]/);
  assert.match(drawer, /visibleAlerts\.map\(alert/);
  assert.match(drawer, /summary\?\.unreadCount/);
  assert.match(drawer, /admin-alerts-updated/);
  assert.match(drawer, /AdminAlertAcknowledgeButton/);
  assert.match(drawer, /readAdminNotificationSnapshot\(body\)/);
  assert.doesNotMatch(drawer, /showAcknowledgedWarnings|shouldShowAdminNotification|notification-preferences|admin-notification-preferences-updated/);
});

test("retired preference API requires admin auth, rejects old mutations, and preserves prior audit records", () => {
  assert.match(api, /requireAdminApiSession\(\)/);
  assert.match(api, /status: 410/);
  assert.match(api, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(api, /updateAdminNotificationPreferences|adminNotificationPreference\.upsert|showAcknowledgedWarnings:/);
  assert.match(service, /ADMIN_NOTIFICATION_PREFERENCE_UPDATED/);
  assert.match(service, /tx\.adminAuditLog\.create/);
  assert.match(schema, /model AdminNotificationPreference \{/);
  assert.match(schema, /showAcknowledgedWarnings\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /CREATE TABLE "AdminNotificationPreference"/);
});
