import assert from "node:assert/strict";
import test from "node:test";

import { notificationSwipeDirection, notificationSwipePosition, NOTIFICATION_DELETE_ACTION_WIDTH, shouldClaimNotificationSwipe, shouldRevealNotificationDelete } from "./notificationSwipe";

test("a closed row continuously follows a partial left drag", () => {
  assert.equal(notificationSwipePosition(0, -1), -1);
  assert.equal(notificationSwipePosition(0, -24), -24);
  assert.equal(notificationSwipePosition(-24, -13), -37);
});

test("an open row continuously follows a partial right drag", () => {
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 1), -87);
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 30), -58);
  assert.equal(notificationSwipePosition(-58, 12), -46);
});

test("dragging is bounded by fully revealed and fully closed positions", () => {
  assert.equal(notificationSwipePosition(0, -1_000), -NOTIFICATION_DELETE_ACTION_WIDTH);
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 1_000), 0);
});

test("release settles according to the resulting position from either direction", () => {
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(0, -43)), false);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(0, -44)), true);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(-88, 43)), true);
  assert.equal(shouldRevealNotificationDelete(notificationSwipePosition(-88, 45)), false);
});

test("only dominant horizontal movement in an available direction is captured", () => {
  assert.equal(shouldClaimNotificationSwipe(-20, 4, 0), true);
  assert.equal(shouldClaimNotificationSwipe(-20, 18, 0), false);
  assert.equal(shouldClaimNotificationSwipe(20, 4, 0), false);
  assert.equal(shouldClaimNotificationSwipe(20, 4, -NOTIFICATION_DELETE_ACTION_WIDTH), true);
  assert.equal(shouldClaimNotificationSwipe(-20, 4, -NOTIFICATION_DELETE_ACTION_WIDTH), false);
});

test("direction remains undecided inside the movement slop, then vertical drag stays with the list", () => {
  assert.equal(notificationSwipeDirection("undecided", 3, 5), "undecided");
  assert.equal(notificationSwipeDirection("undecided", 4, 12), "vertical");
  assert.equal(notificationSwipeDirection("vertical", -40, 12), "vertical");
});

test("horizontal direction locks despite later vertical drift", () => {
  const direction = notificationSwipeDirection("undecided", -12, 4);
  assert.equal(direction, "horizontal");
  assert.equal(notificationSwipeDirection(direction, -18, 22), "horizontal");
  assert.equal(notificationSwipeDirection(direction, -35, 60), "horizontal");
});

test("a new touch can choose horizontal immediately after a vertical scroll gesture", () => {
  assert.equal(notificationSwipeDirection("vertical", -30, 5), "vertical");
  assert.equal(notificationSwipeDirection("undecided", -10, 3), "horizontal");
});

test("horizontal locking preserves smooth partial movement and right-to-close movement", () => {
  assert.equal(notificationSwipeDirection("undecided", -9, 2), "horizontal");
  assert.equal(notificationSwipePosition(0, -9), -9);
  assert.equal(notificationSwipePosition(0, -19), -19);
  assert.equal(notificationSwipeDirection("undecided", 9, 2, -NOTIFICATION_DELETE_ACTION_WIDTH), "horizontal");
  assert.equal(notificationSwipePosition(-NOTIFICATION_DELETE_ACTION_WIDTH, 9), -79);
});
