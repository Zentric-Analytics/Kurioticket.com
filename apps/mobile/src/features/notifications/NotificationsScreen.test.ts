import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
const notificationsRoute = readFileSync(resolve("app/notifications.tsx"), "utf8");
const priceAlertsRoute = readFileSync(resolve("app/price-alerts.tsx"), "utf8");
const home = readFileSync(resolve("src/features/flow/HomeFlowScreen.tsx"), "utf8");

test("notifications and price alerts remain distinct routes", () => {
  assert.match(notificationsRoute, /NotificationsScreen as default/);
  assert.doesNotMatch(notificationsRoute, /PriceAlertsScreen/);
  assert.match(priceAlertsRoute, /PriceAlertsScreen as default/);
});

test("Notification Center exposes production inbox states and read controls", () => {
  for (const contract of ["Notifications", "You’re all caught up", "Loading notifications", "Try again", "Mark all read", "RefreshControl", "markNotificationRead", "markAllNotificationsRead"]) assert.ok(screen.includes(contract), `contains ${contract}`);
  assert.match(screen, /accessibilityLabel=.*Unread|Unread.*accessibilityLabel/s);
  assert.doesNotMatch(screen, /WebView|dangerouslySetInnerHTML|https?:\/\//);
});

test("Home unread badge is backend-sourced, capped, and hidden at zero", () => {
  assert.match(home, /travelApi\.notificationUnreadCount\(\)/);
  assert.match(home, /unreadCount > 0/);
  assert.match(home, /unreadCount > 99 \? "99\+"/);
  assert.match(home, /router\.push\("\/notifications"\)/);
});
