import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import type { MobileNotification } from "../../api/travelApi";
import { canLoadMore, initialNotificationPaginationState, notificationPaginationReducer } from "./notificationPagination";
import { notificationDestination } from "./notificationAction";

const item = (id: string, readAt: string | null = null): MobileNotification => ({ id, type: "SYSTEM", title: `Title ${id}`, body: `Body ${id}`, actionPath: null, metadata: null, readAt, createdAt: "2026-08-09T00:00:00.000Z" });
const reduce = (actions: Parameters<typeof notificationPaginationReducer>[1][]) => actions.reduce(notificationPaginationReducer, initialNotificationPaginationState);

test("first page renders and exposes its next cursor", () => {
  const items = Array.from({ length: 20 }, (_, index) => item(`n-${index}`));
  const state = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items, nextCursor: "n-19" }]);
  assert.equal(state.items.length, 20);
  assert.equal(state.nextCursor, "n-19");
  assert.equal(canLoadMore(state), true);
});

test("second page appends, preserves earlier rows, and deduplicates overlap", () => {
  const state = reduce([
    { type: "first-start", requestId: 1, refresh: false },
    { type: "first-success", requestId: 1, items: [item("n-1"), item("n-2")], nextCursor: "n-2" },
    { type: "more-start", requestId: 2 },
    { type: "more-success", requestId: 2, items: [item("n-2"), item("n-3")], nextCursor: null },
  ]);
  assert.deepEqual(state.items.map(({ id }) => id), ["n-1", "n-2", "n-3"]);
  assert.equal(canLoadMore(state), false);
});

test("refresh replaces stale pages, resets cursor, and ignores stale load-more response", () => {
  const state = reduce([
    { type: "first-start", requestId: 1, refresh: false },
    { type: "first-success", requestId: 1, items: [item("old-1"), item("old-2")], nextCursor: "old-2" },
    { type: "more-start", requestId: 2 },
    { type: "first-start", requestId: 3, refresh: true },
    { type: "more-success", requestId: 2, items: [item("stale")], nextCursor: null },
    { type: "first-success", requestId: 3, items: [item("new-1")], nextCursor: "new-1" },
  ]);
  assert.deepEqual(state.items.map(({ id }) => id), ["new-1"]);
  assert.equal(state.nextCursor, "new-1");
});

test("load-more failure preserves rows and permits retry", () => {
  const state = reduce([
    { type: "first-start", requestId: 1, refresh: false },
    { type: "first-success", requestId: 1, items: [item("n-1")], nextCursor: "n-1" },
    { type: "more-start", requestId: 2 },
    { type: "more-failure", requestId: 2, message: "Try later" },
  ]);
  assert.equal(state.items.length, 1);
  assert.equal(state.loadMoreError, "Try later");
  assert.equal(canLoadMore(state), true);
});

test("older rows can be marked read and mark-all updates every loaded row", () => {
  const loaded = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items: [item("new"), item("old")], nextCursor: null }]);
  const marked = notificationPaginationReducer(loaded, { type: "mark-read", id: "old", readAt: "read-old" });
  assert.equal(marked.items[1].readAt, "read-old");
  const all = notificationPaginationReducer(marked, { type: "mark-all", readAt: "read-all" });
  assert.ok(all.items.every((notification) => notification.readAt));
});

test("routes remain distinct and Home badge remains backend-sourced", () => {
  const notificationsRoute = readFileSync(resolve("app/notifications.tsx"), "utf8");
  const priceAlertsRoute = readFileSync(resolve("app/price-alerts.tsx"), "utf8");
  const home = readFileSync(resolve("src/features/flow/HomeFlowScreen.tsx"), "utf8");
  assert.match(notificationsRoute, /NotificationsScreen as default/);
  assert.match(priceAlertsRoute, /PriceAlertsScreen as default/);
  assert.match(home, /travelApi\.notificationUnreadCount\(\)/);
});

test("notification actions resolve only to supported native destinations", () => {
  const notification = (type: MobileNotification["type"], actionPath: MobileNotification["actionPath"], metadata: MobileNotification["metadata"] = null) => ({ ...item(type), type, actionPath, metadata });
  assert.equal(notificationDestination(notification("PRICE_ALERT", "/settings")), "/price-alerts");
  assert.equal(notificationDestination(notification("SECURITY_UPDATE", "/settings")), "/security");
  assert.equal(notificationDestination(notification("ACCOUNT_UPDATE", "/settings", { deletionRequestId: "delete-1" })), "/security");
  assert.equal(notificationDestination(notification("ACCOUNT_UPDATE", "/personal-information")), "/personal-information");
  assert.equal(notificationDestination(notification("SUPPORT_UPDATE", "/support", { ticketId: "ticket-1" })), "/support");
  assert.equal(notificationDestination(notification("SYSTEM", "/saved")), "/saved");
  assert.equal(notificationDestination(notification("PRICE_ALERT", null)), null);
  assert.equal(notificationDestination({ ...notification("SYSTEM", null), actionPath: "https://evil.example" as never }), null);
  assert.equal(notificationDestination({ ...notification("SYSTEM", null), actionPath: "/unknown" as never }), null);
});

test("notification taps persist reads before navigating and publish badge refreshes", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  assert.match(screen, /await travelApi\.markNotificationRead\(item\.id\)[\s\S]*notifyUnreadCountChanged\(\)[\s\S]*notificationDestination\(item\)[\s\S]*router\.push\(destination\)/);
  assert.match(screen, /await travelApi\.markAllNotificationsRead\(\)[\s\S]*notifyUnreadCountChanged\(\)/);
});
