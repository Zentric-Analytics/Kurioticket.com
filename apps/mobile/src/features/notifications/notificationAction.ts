import type { MobileNotification, MobileNotificationActionPath } from "../../api/travelApi";

const supportedPaths = new Set<MobileNotificationActionPath>([
  "/price-alerts", "/saved", "/settings", "/personal-information", "/security", "/support",
]);

/** Treat the API value as untrusted and only return routes implemented by the app. */
export function notificationDestination(notification: MobileNotification): MobileNotificationActionPath | null {
  const path: unknown = notification.actionPath;
  if (path === null) return null;
  if (notification.type === "PRICE_ALERT") return "/price-alerts";
  if (notification.type === "SECURITY_UPDATE") return "/security";
  if (notification.type === "SUPPORT_UPDATE") return "/support";
  if (notification.type === "ACCOUNT_UPDATE" && notification.metadata?.deletionRequestId) return "/security";
  return typeof path === "string" && supportedPaths.has(path as MobileNotificationActionPath)
    ? path as MobileNotificationActionPath
    : null;
}
