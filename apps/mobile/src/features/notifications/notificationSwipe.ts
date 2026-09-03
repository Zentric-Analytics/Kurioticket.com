export const NOTIFICATION_DELETE_ACTION_WIDTH = 88;

export function shouldClaimNotificationSwipe(dx: number, dy: number) {
  return dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.5;
}

export function shouldRevealNotificationDelete(dx: number) {
  return dx <= -NOTIFICATION_DELETE_ACTION_WIDTH / 2;
}
