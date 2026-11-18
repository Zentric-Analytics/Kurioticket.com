export const onlinePresenceWindowSeconds = 90;
export const onlinePresenceHeartbeatMs = 30_000;

export type OnlinePresencePlatform = "desktop_web" | "mobile_web" | "android" | "ios";

export type OnlinePresenceSnapshot = {
  windowSeconds: number;
  observedAt: string;
} & (
  | { status: "ok"; total: number; registeredAccounts: number; guestSessions: number }
  | { status: "not_configured" }
  | { status: "unavailable" }
);

export function isWebsiteOnlinePresenceRoute(pathname: string | null, authenticated: boolean) {
  if (!pathname?.startsWith("/")) return false;
  const section = pathname.split("/", 2)[1];
  if (section === "api" || section === "mobile") return false;
  return section !== "admin" || authenticated;
}
