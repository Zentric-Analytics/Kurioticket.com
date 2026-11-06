/**
 * Optional display preference for a single administrator's drawer.
 * This never changes alert detection, persistence, unread counts, or the Alerts center.
 */
export function shouldShowAdminNotification(
  alert: { severity: "CRITICAL" | "WARNING"; acknowledged: boolean },
  showAcknowledgedWarnings: boolean,
): boolean {
  return alert.severity === "CRITICAL" || !alert.acknowledged || showAcknowledgedWarnings;
}
