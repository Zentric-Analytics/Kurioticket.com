export const NOTIFICATION_DELETE_ACTION_WIDTH = 88;
export const NOTIFICATION_SWIPE_THRESHOLD = NOTIFICATION_DELETE_ACTION_WIDTH / 2;
export const NOTIFICATION_SWIPE_SLOP = 6;

export type NotificationSwipeDirection = "undecided" | "horizontal" | "vertical";

export function notificationSwipePosition(startPosition: number, dx: number) {
  return Math.max(-NOTIFICATION_DELETE_ACTION_WIDTH, Math.min(0, startPosition + dx));
}

export function shouldClaimNotificationSwipe(dx: number, dy: number, startPosition = 0) {
  return notificationSwipeDirection("undecided", dx, dy, startPosition) === "horizontal";
}

export function notificationSwipeDirection(current: NotificationSwipeDirection, dx: number, dy: number, startPosition = 0): NotificationSwipeDirection {
  if (current !== "undecided") return current;

  const horizontalDistance = Math.abs(dx);
  const verticalDistance = Math.abs(dy);
  if (horizontalDistance < NOTIFICATION_SWIPE_SLOP && verticalDistance < NOTIFICATION_SWIPE_SLOP) return "undecided";
  if (verticalDistance > horizontalDistance) return "vertical";
  if (horizontalDistance <= verticalDistance * 1.2) return "undecided";

  const canMove = (dx < 0 && startPosition > -NOTIFICATION_DELETE_ACTION_WIDTH) || (dx > 0 && startPosition < 0);
  return canMove ? "horizontal" : "vertical";
}

export function shouldRevealNotificationDelete(position: number) {
  return position <= -NOTIFICATION_SWIPE_THRESHOLD;
}
