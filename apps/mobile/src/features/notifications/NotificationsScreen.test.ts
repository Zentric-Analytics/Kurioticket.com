import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import type { MobileNotification } from "../../api/travelApi";
import { canLoadMore, initialNotificationPaginationState, notificationContentState, notificationPaginationReducer } from "./notificationPagination";
import { notificationDestination } from "./notificationAction";
import { notificationSwipePosition, NOTIFICATION_DELETE_ACTION_WIDTH, shouldClaimNotificationSwipe, shouldRevealNotificationDelete } from "./notificationSwipe";

const item = (id: string, readAt: string | null = null): MobileNotification => ({ id, type: "SYSTEM", title: `Title ${id}`, body: `Body ${id}`, actionPath: null, metadata: null, readAt, createdAt: "2026-08-09T00:00:00.000Z" });
const reduce = (actions: Parameters<typeof notificationPaginationReducer>[1][]) => actions.reduce(notificationPaginationReducer, initialNotificationPaginationState);

test("initial loading, error, empty, and list content states are mutually exclusive", () => {
  assert.equal(notificationContentState(initialNotificationPaginationState), "loading");
  const failed = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-failure", requestId: 1 }]);
  assert.equal(notificationContentState(failed), "error");
  const empty = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items: [], nextCursor: null }]);
  assert.equal(notificationContentState(empty), "empty");
  const populated = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items: [item("n-1")], nextCursor: null }]);
  assert.equal(notificationContentState(populated), "list");
  assert.equal(new Set([notificationContentState(initialNotificationPaginationState), notificationContentState(failed), notificationContentState(empty), notificationContentState(populated)]).size, 4);
});

test("retry clears an initial error immediately and resolves to list or successful empty state", () => {
  const failed = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-failure", requestId: 1 }]);
  const retrying = notificationPaginationReducer(failed, { type: "first-start", requestId: 2, refresh: false });
  assert.equal(notificationContentState(retrying), "loading");
  assert.equal(retrying.error, "");
  assert.equal(notificationContentState(notificationPaginationReducer(retrying, { type: "first-success", requestId: 2, items: [item("retry-row")], nextCursor: null })), "list");
  assert.equal(notificationContentState(notificationPaginationReducer(retrying, { type: "first-success", requestId: 2, items: [], nextCursor: null })), "empty");
});

test("refresh failure preserves loaded rows as a non-blocking list error", () => {
  const loaded = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items: [item("existing")], nextCursor: null }]);
  const refreshing = notificationPaginationReducer(loaded, { type: "first-start", requestId: 2, refresh: true });
  const failed = notificationPaginationReducer(refreshing, { type: "first-failure", requestId: 2 });
  assert.equal(notificationContentState(failed), "list");
  assert.deepEqual(failed.items.map(({ id }) => id), ["existing"]);
  assert.equal(failed.error, "Couldn't refresh notifications. Try again.");
});

test("Notifications renders notification-specific loading and error copy only", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  assert.match(screen, /contentState === "loading"[\s\S]*Loading notifications…/);
  assert.match(screen, /contentState === "error"[\s\S]*Couldn't load notifications[\s\S]*Check your connection and try again\.[\s\S]*Try again/);
  assert.match(screen, /contentState === "empty"[\s\S]*You’re all caught up[\s\S]*Important account and travel updates will appear here\./);
  assert.match(screen, /contentState === "list"[\s\S]*state\.items\.map/);
  assert.match(screen, /more-failure[\s\S]*Couldn't load older notifications\. Try again\./);
  assert.doesNotMatch(screen, /The search took too long|Trying again/);
});

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

test("horizontal swipe is claimed without capturing vertical scrolling", () => {
  assert.equal(shouldClaimNotificationSwipe(-20, 4), true);
  assert.equal(shouldClaimNotificationSwipe(-20, 18), false);
  assert.equal(shouldClaimNotificationSwipe(20, 1), false);
  assert.equal(shouldClaimNotificationSwipe(20, 1, -NOTIFICATION_DELETE_ACTION_WIDTH), true);
  assert.equal(shouldClaimNotificationSwipe(10, 9, -NOTIFICATION_DELETE_ACTION_WIDTH), false);
});

test("swipe position follows partial left and right drags from the current position", () => {
  assert.equal(notificationSwipePosition(0, -12), -12);
  assert.equal(notificationSwipePosition(0, -31), -31);
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 15), -73);
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 40), -48);
});

test("swipe position is clamped to the delete width and fully closed position", () => {
  assert.equal(notificationSwipePosition(0, -200), -NOTIFICATION_DELETE_ACTION_WIDTH);
  assert.equal(notificationSwipePosition(-20, 200), 0);
});

test("release threshold opens or closes based on the resulting row position", () => {
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(0, -43)), false);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(0, -44)), true);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(-88, 43)), true);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(-88, 45)), false);
});

test("deleting one read or unread notification removes only that row", () => {
  const loaded = reduce([{ type: "first-start", requestId: 1, refresh: false }, { type: "first-success", requestId: 1, items: [item("unread"), item("read", "read-at"), item("other")], nextCursor: null }]);
  const withoutUnread = notificationPaginationReducer(loaded, { type: "delete", id: "unread" });
  assert.deepEqual(withoutUnread.items.map(({ id }) => id), ["read", "other"]);
  const withoutRead = notificationPaginationReducer(withoutUnread, { type: "delete", id: "read" });
  assert.deepEqual(withoutRead.items.map(({ id }) => id), ["other"]);
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
  assert.match(screen, /onPanResponderRelease:[\s\S]*shouldRevealNotificationDelete/);
  assert.match(screen, /onPress=\{\(\) => void deleteItem\(\)\}/);
  assert.match(screen, /await travelApi\.deleteNotification\(item\.id\)[\s\S]*dispatch\(\{ type: "delete", id: item\.id \}\)[\s\S]*if \(!item\.readAt\) notifyUnreadCountChanged\(\)/);
});

test("the list controls one open row and scrolling closes it", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  assert.match(screen, /const \[openNotificationId, setOpenNotificationId\] = useState<string \| null>\(null\)/);
  assert.match(screen, /onScrollBeginDrag=\{\(\) => setOpenNotificationId\(null\)\}/);
  assert.match(screen, /isOpen=\{openNotificationId === item\.id\}/);
  assert.match(screen, /onSetOpen=\{\(open\) => setOpenNotificationId\(open \? item\.id : null\)\}/);
});

test("a horizontal row gesture locks out the ScrollView until release, rejection, or cancellation", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  assert.match(screen, /<ScrollView scrollEnabled=\{scrollEnabled\}/);
  assert.match(screen, /onMoveShouldSetPanResponderCapture:[\s\S]*shouldCaptureSwipe/);
  assert.match(screen, /nextDirection === "horizontal"[\s\S]*onHorizontalLockRef\.current\(\)/);
  assert.match(screen, /onPanResponderTerminationRequest: \(\) => gestureDirection\.current !== "horizontal"/);
  assert.match(screen, /onPanResponderRelease:[\s\S]*finishHorizontalSwipe\(\)/);
  assert.match(screen, /onPanResponderReject: finishHorizontalSwipe/);
  assert.match(screen, /onPanResponderTerminate:[\s\S]*finishHorizontalSwipe\(\)/);
  assert.match(screen, /useEffect\(\(\) => \(\) => onHorizontalReleaseRef\.current\(\), \[\]\)/);
});

test("swiping a row never performs notification deletion", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  const responder = screen.match(/const panResponder = useMemo\([\s\S]*?\n  \}\), \[/)?.[0] ?? "";
  assert.doesNotMatch(responder, /deleteItem|deleteNotification/);
  assert.match(screen, /onPress=\{\(\) => void deleteItem\(\)\}/);
});

test("swiping only settles the row while explicit Delete owns persistence and failure closes", () => {
  const screen = readFileSync(resolve("src/features/notifications/NotificationsScreen.tsx"), "utf8");
  const release = screen.match(/onPanResponderRelease:[\s\S]*?\n    \},/)?.[0] ?? "";
  assert.doesNotMatch(release, /deleteItem|\bonDelete\(|deleteNotification/);
  assert.match(screen, /onPress=\{\(\) => void deleteItem\(\)\}/);
  assert.match(screen, /catch \{ onHorizontalReleaseRef\.current\(\); onSetOpen\(false\); settle\(false\); setDeleting\(false\); \}/);
});