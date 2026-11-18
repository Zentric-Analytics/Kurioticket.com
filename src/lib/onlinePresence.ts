export const onlinePresenceWindowSeconds = 90;
export const onlinePresenceHeartbeatMs = 30_000;

export type OnlinePresencePlatform = "desktop_web" | "mobile_web" | "android" | "ios";

export type OnlinePresenceSnapshot = {
  windowSeconds: number;
  observedAt: string;
} & (
  | { status: "ok"; total: number; registeredAccounts: number; guestSessions: number }
  | { status: "unavailable" }
);
