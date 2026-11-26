import { onlinePresenceWindowSeconds, type OnlinePresencePlatformCounts } from "@/lib/onlinePresence";
import { liveGuestCountryName, safeLiveGuestAccess, safeLiveGuestReference, type LiveGuestAccess } from "./guestFirstAccessObservation";

export type OnlineIdentityRow = {
  id: string;
  kind: "registered" | "guest";
  name: string;
  email: string | null;
  role: "USER" | "SUPPORT" | "ADMIN" | null;
  /** Most recent live account session's recorded approximate access location. */
  locationLabel: string | null;
  platforms: Array<"desktop_web" | "mobile_web" | "ios" | "android" | "unclassified">;
  lastSeenAt: string;
  liveReference?: string;
  liveAccess?: LiveGuestAccess;
};
export type AdminOnlineUsersSnapshot =
  | { status: "ok"; observedAt: string; windowSeconds: number; total: number;
      registeredAccounts: number; guestSessions: number; platforms: OnlinePresencePlatformCounts;
      rows: OnlineIdentityRow[] }
  | { status: "unavailable" | "not_configured"; observedAt: string; windowSeconds: number };

type Platform = OnlineIdentityRow["platforms"][number];
export type RawPresenceRow = {
  sourceId: string; platform: string | null; accountSessionId: string | null;
  userId: string | null; name: string | null; email: string | null; role: string | null;
  locationLabel: string | null; lastSeenAt: Date;
  liveReference?: string;
  liveAccess?: LiveGuestAccess;
};
const platformKeys = ["desktop_web", "mobile_web", "ios", "android"] as const;
function normalizePlatform(value: string | null): Platform {
  return platformKeys.find(platform => platform === value) ?? "unclassified";
}
const roles = new Set(["USER", "SUPPORT", "ADMIN"]);

/** Display only the location label recorded by the trusted session observation.
 * An unverified or invalid label stays unavailable; never infer from locale. */
function safeLocation(label: string | null): string | null {
  const trimmed = label?.trim() ?? "";
  if (!trimmed || trimmed.length > 160 || [...trimmed].some(char => char.charCodeAt(0) < 32)) return null;
  return trimmed;
}

export function buildAdminOnlineUsersSnapshot(
  observations: RawPresenceRow[], now: Date,
): Extract<AdminOnlineUsersSnapshot, { status: "ok" }> {
  const cutoff = now.getTime() - onlinePresenceWindowSeconds * 1000;
  const accounts = new Map<string, {
    row: OnlineIdentityRow;
    platforms: Set<Platform>;
  }>();
  const guests = new Map<string, { platforms: Set<Platform>; lastSeenAt: Date; liveReference: string | null; liveAccess: LiveGuestAccess | null }>();
  for (const observation of observations) {
    const at = observation.lastSeenAt.getTime();
    if (!Number.isFinite(at) || at <= cutoff || at > now.getTime()) continue;
    const platform = normalizePlatform(observation.platform);
    if (observation.accountSessionId === null) {
      // The signed anonymous source is a temporary presence credential,
      // NOT a linked visitor ID; never reveal it or invent a customer identity.
      const reference = safeLiveGuestReference(observation.liveReference);
      const access = safeLiveGuestAccess(observation.liveAccess, observation.lastSeenAt);
      const verifiedAccess = reference && access?.reference === reference ? access : null;
      const prior = guests.get(observation.sourceId);
      if (prior) {
        prior.platforms.add(platform);
        if (at > prior.lastSeenAt.getTime()) {
          prior.lastSeenAt = observation.lastSeenAt;
          prior.liveReference = reference;
          prior.liveAccess = verifiedAccess;
        }
      } else guests.set(observation.sourceId, { platforms: new Set([platform]), lastSeenAt: observation.lastSeenAt,
        liveReference: reference, liveAccess: verifiedAccess });
      continue;
    }
    // Missing or invalid session joins must not count as guests or users.
    if (!observation.userId || !roles.has(observation.role ?? "")) continue;
    const existing = accounts.get(observation.userId);
    if (existing) {
      existing.platforms.add(platform);
      if (at > Date.parse(existing.row.lastSeenAt)) {
        existing.row.lastSeenAt = observation.lastSeenAt.toISOString();
        // A different, older device's location is not necessarily current.
        existing.row.locationLabel = safeLocation(observation.locationLabel);
      }
    } else {
      accounts.set(observation.userId, {
        row: {
          id: observation.userId, kind: "registered",
          name: observation.name?.trim() || "Unnamed user",
          email: observation.email, role: observation.role as "USER" | "SUPPORT" | "ADMIN",
          locationLabel: safeLocation(observation.locationLabel),
          platforms: [], lastSeenAt: observation.lastSeenAt.toISOString(),
        },
        platforms: new Set([platform]),
      });
    }
  }
  const registered = [...accounts.values()].map(({ row, platforms }) => ({
    ...row, platforms: [...platforms].sort(),
  }));
  const anonymous = [...guests.values()].sort((a, b) =>
    b.lastSeenAt.getTime() - a.lastSeenAt.getTime()).map((guest, index): OnlineIdentityRow => ({
    // This is only a per-snapshot display key; never a stable anonymous identifier.
    id: "guest-" + (index + 1),
    kind: "guest", name: "Guest session", email: null, role: null,
    locationLabel: liveGuestCountryName(guest.liveAccess?.countryCode),
    ...(guest.liveReference ? { liveReference: guest.liveReference } : {}),
    ...(guest.liveAccess ? { liveAccess: guest.liveAccess } : {}),
    platforms: [...guest.platforms].sort(), lastSeenAt: guest.lastSeenAt.toISOString(),
  }));
  const rows = [...registered, ...anonymous].sort((a, b) =>
    Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt) || a.id.localeCompare(b.id));
  const counts = { desktop_web: 0, mobile_web: 0, ios: 0, android: 0, website: 0, unclassified: 0 };
  for (const row of rows) {
    for (const platform of row.platforms) counts[platform]++;
    if (row.platforms.some(platform => platform === "desktop_web" || platform === "mobile_web")) counts.website++;
  }
  return {
    status: "ok", observedAt: now.toISOString(), windowSeconds: onlinePresenceWindowSeconds,
    total: rows.length, registeredAccounts: registered.length, guestSessions: anonymous.length,
    platforms: counts, rows,
  };
}
