export const onlinePresenceWindowSeconds = 90;
export const onlinePresenceHeartbeatMs = 30_000;

export type OnlinePresencePlatform = "desktop_web" | "mobile_web" | "android" | "ios";

/** A registered account can appear on multiple platforms; anonymous credentials are sessions. */
export type OnlinePresencePlatformCounts = Record<OnlinePresencePlatform, number> & { unclassified: number };

export type OnlinePresenceSnapshot = {
  windowSeconds: number;
  observedAt: string;
} & (
  | { status: "ok"; total: number; registeredAccounts: number; guestSessions: number; platforms?: OnlinePresencePlatformCounts }
  | { status: "not_configured" }
  | { status: "unavailable" }
);

export function isWebsiteOnlinePresenceRoute(pathname: string | null, authenticated: boolean) {
  if (!pathname?.startsWith("/")) return false;
  const section = pathname.split("/", 2)[1];
  if (section === "api" || section === "mobile") return false;
  return section !== "admin" || authenticated;
}

/** Reject partial or contradictory presence breakdowns before showing a metric. */
export function hasVerifiedPlatformCounts(snapshot: OnlinePresenceSnapshot): boolean {
  if (snapshot.status !== "ok" || !snapshot.platforms) return false;
  const counts = snapshot.platforms;
  const values = [snapshot.total, snapshot.registeredAccounts, snapshot.guestSessions,
    counts.desktop_web, counts.mobile_web, counts.ios, counts.android, counts.unclassified];
  if (!values.every(value => Number.isSafeInteger(value) && value >= 0)) return false;
  const sum = counts.desktop_web + counts.mobile_web + counts.ios + counts.android + counts.unclassified;
  return Number.isSafeInteger(sum) && snapshot.total === snapshot.registeredAccounts + snapshot.guestSessions
    && sum >= snapshot.total && Object.values(counts).every(value => value <= snapshot.total);
}
