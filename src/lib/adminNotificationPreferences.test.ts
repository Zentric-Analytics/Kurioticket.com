import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { shouldShowAdminNotification } from "@/lib/adminNotificationPreferences";

const settings = readFileSync("src/app/admin/settings/notifications/page.tsx", "utf8");
const panel = readFileSync("src/components/admin/AdminNotificationPreferencesPanel.tsx", "utf8");
const drawer = readFileSync("src/components/admin/AdminNotificationsPanel.tsx", "utf8");
const api = readFileSync("src/app/api/admin/notification-preferences/route.ts", "utf8");
const service = readFileSync("src/services/adminNotificationPreferencesService.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261106000000_admin_notification_preferences/migration.sql", "utf8");

test("notification preference never hides critical or unacknowledged operational alerts", () => {
  for (const acknowledged of [false, true]) {
    assert.equal(shouldShowAdminNotification({ severity: "CRITICAL", acknowledged }, false), true);
    assert.equal(shouldShowAdminNotification({ severity: "CRITICAL", acknowledged }, true), true);
  }
  assert.equal(shouldShowAdminNotification({ severity: "WARNING", acknowledged: false }, false), true);
  assert.equal(shouldShowAdminNotification({ severity: "WARNING", acknowledged: true }, false), false);
  assert.equal(shouldShowAdminNotification({ severity: "WARNING", acknowledged: true }, true), true);
});

test("Settings exposes a real persisted notification preference and no fake delivery switches", () => {
  assert.match(settings, /<AdminNotificationPreferencesPanel/);
  assert.match(settings, /readAdminNotificationPreferences/);
  assert.match(settings, /notificationPreferences\.available/);
  assert.match(settings, /Notifications<\/h2>/);
  assert.match(panel, /role="switch"/);
  assert.match(panel, /aria-checked=\{value\}/);
  assert.match(panel, /disabled=\{!available \|\| saving\}/);
  assert.match(panel, /showAcknowledgedWarnings: next/);
  assert.match(panel, /Preference saved/);
  assert.match(panel, /The preference was not saved/);
  assert.match(panel, /\/admin\/notifications/);
  assert.match(panel, /ADMIN_NOTIFICATION_PREFERENCE_UPDATED/);
  assert.doesNotMatch(panel, /email notifications enabled|disable critical|disable all alerts/i);
});

test("drawer applies only a display filter, never changing canonical counts or alerts", () => {
  assert.match(drawer, /shouldShowAdminNotification\(alert, showAcknowledgedWarnings\)/);
  assert.match(drawer, /visibleAlerts\.map\(alert/);
  assert.match(drawer, /snapshot\?\.alerts\.filter/);
  assert.match(drawer, /setShowAcknowledgedWarnings\(true\)/);
  assert.match(drawer, /admin-notification-preferences-updated/);
  assert.match(drawer, /readAdminNotificationSnapshot\(body\)/);
  assert.match(drawer, /summary\?\.unreadCount/);
  assert.doesNotMatch(drawer, /DELETE.*notification-preferences|PATCH.*notification-preferences/);
});

test("preference API authenticates, validates and rate limits admin writes", () => {
  assert.match(api, /requireAdminApiSession\(\)/);
  assert.match(api, /z\.object\(\{/);
  assert.match(api, /showAcknowledgedWarnings: z\.boolean\(\)/);
  assert.match(api, /\.strict\(\)/);
  assert.match(api, /checkAuthRateLimit\(/);
  assert.match(api, /admin-notification-preference/);
  assert.match(api, /status: 429/);
  assert.match(api, /parsed\.success/);
  assert.match(api, /status: 400/);
  assert.match(api, /status: 503/);
  assert.match(api, /updateAdminNotificationPreferences\(/);
});

test("preference persistence is per-admin and audit-atomic", () => {
  assert.match(service, /adminNotificationPreference\.findUnique/);
  assert.match(service, /adminNotificationPreference\.upsert/);
  assert.match(service, /\$transaction\(async \(tx\)/);
  assert.match(service, /tx\.adminAuditLog\.create/);
  assert.match(service, /targetType: "AdminNotificationPreference"/);
  assert.match(service, /previous,/);
  assert.match(service, /next: input\.showAcknowledgedWarnings/);
  assert.match(service, /available: false/);
  assert.match(schema, /model AdminNotificationPreference \{/);
  assert.match(schema, /adminUserId\s+String\s+@unique/);
  assert.match(schema, /showAcknowledgedWarnings\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /CREATE TABLE "AdminNotificationPreference"/);
  assert.match(migration, /ON DELETE CASCADE/);
});
