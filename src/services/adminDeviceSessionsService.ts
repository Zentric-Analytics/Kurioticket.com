import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { deviceTodayWindow, deviceHistoryWindow, DEVICE_HISTORY_PAGE_SIZE, type DeviceHistoryQuery } from "@/lib/adminDeviceHistory";

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
  revokedAt: Date | null;
};

export type DeviceSessionResult =
  | { status: "ok"; sessions: AdminDeviceSession[] }
  | { status: "unavailable" };

export type FullDeviceHistoryResult =
  | { status: "ok"; sessions: AdminDeviceSession[]; total: number; hasNext: boolean }
  | { status: "unavailable" };

export async function loadAdminDeviceSessions(userId: string): Promise<DeviceSessionResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const sessions = await db.accountSession.findMany({
      where: { userId, lastSeenAt: deviceTodayWindow() },
      orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
      take: 3,
      select: {
        id: true, client: true, platform: true,
        deviceLabel: true, browser: true, os: true, locationLabel: true,
        lastSeenAt: true, createdAt: true, revokedAt: true,
      },
    });
    return { status: "ok", sessions };
  } catch {
    return { status: "unavailable" };
  }
}


/** All retained records, paginated at the database. Not limited by the profile's Today preview. */
export async function loadAdminFullDeviceHistory(
  userId: string, query: DeviceHistoryQuery,
): Promise<FullDeviceHistoryResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const where = { userId, lastSeenAt: deviceHistoryWindow(query) };
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
          lastSeenAt: true, createdAt: true, revokedAt: true,
        },
      }),
    ]);
    return { status: "ok", sessions, total,
      hasNext: query.page * DEVICE_HISTORY_PAGE_SIZE < total };
  } catch {
    return { status: "unavailable" };
  }
}
