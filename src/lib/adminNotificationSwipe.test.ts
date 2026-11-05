import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_NOTIFICATION_DELETE_WIDTH, adminNotificationSwipeDirection, adminNotificationSwipePosition } from "./adminNotificationSwipe";
import { NOTIFICATION_DELETE_ACTION_WIDTH, notificationSwipeDirection, notificationSwipePosition } from "../../apps/mobile/src/features/notifications/notificationSwipe";

test("notification swipe follows the app thresholds without capturing vertical scroll", () => {
  assert.equal(ADMIN_NOTIFICATION_DELETE_WIDTH, NOTIFICATION_DELETE_ACTION_WIDTH);
  for (const [dx, dy, start] of [[-4, 1, 0], [-20, 4, 0], [-20, 18, 0], [20, 1, 0], [20, 1, -88], [10, 9, -88], [0, 35, 0]]) {
    assert.equal(adminNotificationSwipeDirection(dx, dy, start), notificationSwipeDirection("undecided", dx, dy, start));
    assert.equal(adminNotificationSwipePosition(start, dx), notificationSwipePosition(start, dx));
  }
});
