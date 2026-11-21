export const onlinePresenceWindowSeconds = 90;
export const onlinePresenceHeartbeatMs = 30_000;

export type OnlinePresencePlatform = "desktop_web" | "mobile_web" | "android" | "ios";

/** A registered account can appear on multiple platforms; anonymous credentials are sessions. */
export type OnlinePresencePlatformCounts = Record<OnlinePresencePlatform, number> & {
  /** Distinct authenticated customer accounts across both web platforms plus anonymous web sessions. */
  website: number;
  unclassified: number;
};

export type OnlinePresenceSnapshot = {
  windowSeconds: number;
  observedAt: string;
} & (
  | { status: "ok"; total: number; registeredAccounts: number; guestSessions: number; platforms?: OnlinePresencePlatformCounts }
  | { status: "not_configured" }
  | { status: "unavailable" }
);

export function isWebsiteOnlinePresenceRoute(pathname: string | null, _authenticated: boolean) {
  if (!pathname?.startsWith("/")) return false;
  const section = pathname.split("/", 2)[1];
  // Internal admin workspace activity is not customer-facing platform use.
  return section !== "api" && section !== "mobile" && section !== "admin";
}

/** Reject partial or contradictory presence breakdowns before showing a metric. */
export function hasVerifiedPlatformCounts(snapshot: OnlinePresenceSnapshot): boolean {
  if (snapshot.status !== "ok" || !snapshot.platforms) return false;
  const counts = snapshot.platforms;
  const values = [snapshot.total, snapshot.registeredAccounts, snapshot.guestSessions,
    counts.desktop_web, counts.mobile_web, counts.ios, counts.android, counts.website, counts.unclassified];
  if (!values.every(value => Number.isSafeInteger(value) && value >= 0)) return false;
  const sum = counts.desktop_web + counts.mobile_web + counts.ios + counts.android + counts.unclassified;
  // A signed-in customer may use both website clients: website must be their
  // union, not desktop + mobile web. The per-platform sum can exceed total
  // when an account is simultaneously active on native and web platforms.
  return Number.isSafeInteger(sum) && snapshot.total === snapshot.registeredAccounts + snapshot.guestSessions
    && sum >= snapshot.total && Object.values(counts).every(value => value <= snapshot.total)
    && counts.website >= Math.max(counts.desktop_web, counts.mobile_web)
    && counts.website <= counts.desktop_web + counts.mobile_web
    && counts.website + counts.ios + counts.android + counts.unclassified >= snapshot.total;
}
