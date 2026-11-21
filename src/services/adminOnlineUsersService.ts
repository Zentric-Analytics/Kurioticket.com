import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { onlinePresenceWindowSeconds, type OnlinePresencePlatformCounts } from "@/lib/onlinePresence";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type OnlineIdentityRow = {
  id: string;
  kind: "registered" | "guest";
  name: string;
  email: string | null;
  role: "USER" | "SUPPORT" | "ADMIN" | null;
  platforms: Array<"desktop_web" | "mobile_web" | "ios" | "android" | "unclassified">;
  lastSeenAt: string;
};
export type AdminOnlineUsersSnapshot =
  | { status: "ok"; observedAt: string; windowSeconds: number; total: number;
      registeredAccounts: number; guestSessions: number; platforms: OnlinePresencePlatformCounts;
      rows: OnlineIdentityRow[] }
  | { status: "unavailable" | "not_configured"; observedAt: string; windowSeconds: number };

type Platform = OnlineIdentityRow["platforms"][number];
type RawPresenceRow = {
  sourceId: string; platform: string | null; accountSessionId: string | null;
  userId: string | null; name: string | null; email: string | null; role: string | null;
  lastSeenAt: Date;
};
const maxObservations = 20000;
const platformKeys = ["desktop_web", "mobile_web", "ios", "android"] as const;
function normalizePlatform(value: string | null): Platform {
  return platformKeys.find(platform => platform === value) ?? "unclassified";
}
const roles = new Set(["USER", "SUPPORT", "ADMIN"]);

export function buildAdminOnlineUsersSnapshot(
  observations: RawPresenceRow[], now: Date,
): Extract<AdminOnlineUsersSnapshot, { status: "ok" }> {
  const cutoff = now.getTime() - onlinePresenceWindowSeconds * 1000;
  const accounts = new Map<string, {
    row: OnlineIdentityRow;
    platforms: Set<Platform>;
  }>();
  const guests = new Map<string, { platforms: Set<Platform>; lastSeenAt: Date }>();
  for (const observation of observations) {
    const at = observation.lastSeenAt.getTime();
    if (!Number.isFinite(at) || at <= cutoff || at > now.getTime()) continue;
    const platform = normalizePlatform(observation.platform);
    if (observation.accountSessionId === null) {
      // The signed anonymous source is a temporary presence credential,
      // NOT a linked visitor ID; never reveal it or invent a customer identity.
      const prior = guests.get(observation.sourceId);
      if (prior) {
        prior.platforms.add(platform);
        if (at > prior.lastSeenAt.getTime()) prior.lastSeenAt = observation.lastSeenAt;
      } else guests.set(observation.sourceId, { platforms: new Set([platform]), lastSeenAt: observation.lastSeenAt });
      continue;
    }
    // Missing or invalid session joins must not count as guests or users.
    if (!observation.userId || !roles.has(observation.role ?? "")) continue;
    const existing = accounts.get(observation.userId);
    if (existing) {
      existing.platforms.add(platform);
      if (at > Date.parse(existing.row.lastSeenAt)) existing.row.lastSeenAt = observation.lastSeenAt.toISOString();
    } else {
      accounts.set(observation.userId, {
        row: {
          id: observation.userId, kind: "registered",
          name: observation.name?.trim() || "Unnamed user",
          email: observation.email, role: observation.role as "USER" | "SUPPORT" | "ADMIN",
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

/** A single bounded observation read drives both live metrics and filtered rows.
 * The existing canonical online-presence health probe must succeed first.
 * Unknown/authentication-invalid session rows never become anonymous guests.
 */
export async function readAdminOnlineUsers(
  environment: PublicEnvironment, now = new Date(), browserReferrer?: string,
): Promise<AdminOnlineUsersSnapshot> {
  const base = { observedAt: now.toISOString(), windowSeconds: onlinePresenceWindowSeconds };
  const health = await getOnlinePresenceSnapshot(environment, now, browserReferrer);
  if (health.status !== "ok") return { ...base, status: health.status };
  const db = getOptionalPrisma();
  if (!db) return { ...base, status: "unavailable" };
  const cutoff = new Date(now.getTime() - onlinePresenceWindowSeconds * 1000);
  try {
    const observations = await db.$queryRaw<RawPresenceRow[]>(Prisma.sql`
      SELECT p."sourceId", p."platform", p."accountSessionId", p."lastSeenAt",
        CASE WHEN u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
          AND u."emailVerified" IS NOT NULL
          AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
          AND s."sessionVersion" = u."sessionVersion"
          AND (NOT COALESCE(security."twoFactorEnabled", FALSE) OR s."assuranceLevel" <> 'PRIMARY')
          THEN u."id" ELSE NULL END AS "userId",
        CASE WHEN u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
          AND u."emailVerified" IS NOT NULL
          AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
          AND s."sessionVersion" = u."sessionVersion"
          AND (NOT COALESCE(security."twoFactorEnabled", FALSE) OR s."assuranceLevel" <> 'PRIMARY')
          THEN u."name" ELSE NULL END AS "name",
        CASE WHEN u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
          AND u."emailVerified" IS NOT NULL
          AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
          AND s."sessionVersion" = u."sessionVersion"
          AND (NOT COALESCE(security."twoFactorEnabled", FALSE) OR s."assuranceLevel" <> 'PRIMARY')
          THEN u."email" ELSE NULL END AS "email",
        CASE WHEN u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
          AND u."emailVerified" IS NOT NULL
          AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
          AND s."sessionVersion" = u."sessionVersion"
          AND (NOT COALESCE(security."twoFactorEnabled", FALSE) OR s."assuranceLevel" <> 'PRIMARY')
          THEN u."role"::text ELSE NULL END AS "role"
      FROM "OnlinePresenceSession" p
      LEFT JOIN "AccountSession" s ON s."id" = p."accountSessionId"
      LEFT JOIN "User" u ON u."id" = s."userId"
      LEFT JOIN "UserSecuritySettings" security ON security."userId" = u."id"
      WHERE p."environment" = ${environment}
        AND p."lastSeenAt" > ${cutoff}
        AND p."lastSeenAt" <= ${now}
      ORDER BY p."lastSeenAt" DESC, p."sourceId" ASC
      LIMIT ${maxObservations + 1}
    `);
    // Never show a partial snapshot as a complete online roster.
    if (observations.length > maxObservations) return { ...base, status: "unavailable" };
    return buildAdminOnlineUsersSnapshot(observations, now);
  } catch {
    return { ...base, status: "unavailable" };
  }
}
