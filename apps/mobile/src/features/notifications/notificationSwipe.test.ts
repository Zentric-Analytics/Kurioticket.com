import assert from "node:assert/strict";
import test from "node:test";

import { notificationSwipePosition, NOTIFICATION_DELETE_ACTION_WIDTH, shouldClaimNotificationSwipe, shouldRevealNotificationDelete } from "./notificationSwipe";

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
