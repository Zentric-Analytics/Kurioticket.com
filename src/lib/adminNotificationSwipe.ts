// Match the native notification gesture without importing the native app into web.
export const ADMIN_NOTIFICATION_DELETE_WIDTH = 88;

export function adminNotificationSwipeDirection(dx: number, dy: number, start: number): "undecided" | "horizontal" | "vertical" {
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (x < 6 && y < 6) return "undecided";
  if (y > x) return "vertical";
  if (x <= y * 1.2) return "undecided";
  return (dx < 0 && start > -ADMIN_NOTIFICATION_DELETE_WIDTH) || (dx > 0 && start < 0) ? "horizontal" : "vertical";
}

export function adminNotificationSwipePosition(start: number, dx: number) {
  return Math.max(-ADMIN_NOTIFICATION_DELETE_WIDTH, Math.min(0, start + dx));
}
