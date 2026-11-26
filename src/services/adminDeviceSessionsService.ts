import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";
import { getOptionalPrisma } from "@/lib/prisma";
import { deviceTodayWindow, deviceHistoryWindow, DEVICE_HISTORY_PAGE_SIZE, type DeviceHistoryQuery } from "@/lib/adminDeviceHistory";
import { accountDevicePlatformWhere } from "@/lib/adminDevicePlatform";

/** A bounded, account-owned view. Never return tokens, IPs or raw user agents. */
export type AdminDeviceSession = {
  id: string;
  client: "WEB" | "MOBILE";
  platform: string | null;
  deviceLabel: string | null;
  browser: string | null;
  os: string | null;
  locationLabel: string | null;
  lastSeenAt: Date;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
};

export type DeviceSessionResult =
  | { status: "ok"; sessions: AdminDeviceSession[] }
  | { status: "unavailable" };

export type FullDeviceHistoryResult =
  | { status: "ok"; owner: { id: string; name: string | null; email: string | null }; sessions: AdminDeviceSession[]; total: number; hasNext: boolean; onlineSessionIds: string[] | null; validSessionIds: string[] | null }
  | { status: "not_found" }
  | { status: "unavailable" };

export async function loadAdminDeviceSessions(userId: string, timeZone = "UTC", now = new Date(), range: "today" | "all" = "today"): Promise<DeviceSessionResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const sessions = await db.accountSession.findMany({
      where: { userId, lastSeenAt: range === "all" ? { lte: now } : deviceTodayWindow(now, timeZone) },
      orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
      take: 1,
      select: {
        id: true, client: true, platform: true,
        deviceLabel: true, browser: true, os: true, locationLabel: true,
        lastSeenAt: true, createdAt: true, expiresAt: true, revokedAt: true, revokeReason: true,
      },
    });
    return { status: "ok", sessions };
  } catch {
    return { status: "unavailable" };
  }
}


/** All retained records, paginated at the database. Not limited by the profile's Today preview. */
export async function loadAdminFullDeviceHistory(
  userId: string, query: DeviceHistoryQuery, timeZone = "UTC", now = new Date(),
): Promise<FullDeviceHistoryResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const owner = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
    if (!owner) return { status: "not_found" };
    const where = { userId, lastSeenAt: deviceHistoryWindow(query, now, timeZone), ...accountDevicePlatformWhere(query.platform) };
    const [total, sessions] = await Promise.all([
      db.accountSession.count({ where }),
      db.accountSession.findMany({
        where,
        orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * DEVICE_HISTORY_PAGE_SIZE,
        take: DEVICE_HISTORY_PAGE_SIZE,
        select: {
          id: true, client: true, platform: true,
          deviceLabel: true, browser: true, os: true, locationLabel: true,
          lastSeenAt: true, createdAt: true, expiresAt: true, revokedAt: true, revokeReason: true,
        },
      }),
    ]);
    // An authenticated session can remain valid for hours without being online.
    // First check the same measured presence backend used by the Online Users cards.
    // If monitoring is unavailable, never reinterpret missing evidence as inactivity.
    let onlineSessionIds: string[] | null = null;
    let validSessionIds: string[] | null = null;
    if (sessions.length) {
      const now = new Date();
      try {
        const environment = getPublicEnvironment();
        const snapshot = await getOnlinePresenceSnapshot(environment, now);
        if (snapshot.status === "ok") {
          const cutoff = new Date(now.getTime() - onlinePresenceWindowSeconds * 1000);
          const ids = sessions.map(session => session.id);
          // Return IDs only. The account/session joins enforce the exact validity
          // checks of the aggregate live-presence reader, but at device granularity.
          // A missing heartbeat is Inactive only for an authenticated valid session.
          const verified = await db.$queryRaw<Array<{ id: string; online: boolean }>>(Prisma.sql`
            SELECT s."id",
              COALESCE(BOOL_OR(p."accountSessionId" IS NOT NULL), FALSE) AS "online"
            FROM "AccountSession" s
            JOIN "User" u ON u."id" = s."userId"
            LEFT JOIN "UserSecuritySettings" security ON security."userId" = u."id"
            LEFT JOIN "OnlinePresenceSession" p ON p."accountSessionId" = s."id"
              AND p."environment" = ${environment}
              AND p."lastSeenAt" > ${cutoff} AND p."lastSeenAt" <= ${now}
            WHERE s."userId" = ${userId}
              AND s."id" IN (${Prisma.join(ids)})
              AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
              AND s."sessionVersion" = u."sessionVersion"
              AND u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
              AND u."emailVerified" IS NOT NULL
              AND (NOT COALESCE(security."twoFactorEnabled", false) OR s."assuranceLevel" <> 'PRIMARY')
            GROUP BY s."id"
          `);
          if (!verified.every(row => typeof row.id === "string" && ids.includes(row.id)
              && typeof row.online === "boolean")) {
            throw new Error("Invalid account session presence observations");
          }
          validSessionIds = verified.map(row => row.id);
          onlineSessionIds = verified.filter(row => row.online).map(row => row.id);
        }
      } catch {
        // Preserve historical sessions while failing closed on online claims.
        onlineSessionIds = null;
        validSessionIds = null;
      }
    }
    return { status: "ok", owner, sessions, total, onlineSessionIds, validSessionIds,
      hasNext: query.page * DEVICE_HISTORY_PAGE_SIZE < total };
  } catch {
    return { status: "unavailable" };
  }
}
