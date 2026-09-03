export const NOTIFICATION_DELETE_ACTION_WIDTH = 88;
export const NOTIFICATION_SWIPE_THRESHOLD = NOTIFICATION_DELETE_ACTION_WIDTH / 2;

export function notificationSwipePosition(startPosition: number, dx: number) {
  return Math.max(-NOTIFICATION_DELETE_ACTION_WIDTH, Math.min(0, startPosition + dx));
}

export function shouldClaimNotificationSwipe(dx: number, dy: number, startPosition = 0) {
  const horizontal = Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
  if (!horizontal) return false;
  return (dx < 0 && startPosition > -NOTIFICATION_DELETE_ACTION_WIDTH) || (dx > 0 && startPosition < 0);
}

export function shouldRevealNotificationDelete(position: number) {
  return position <= -NOTIFICATION_SWIPE_THRESHOLD;
}
