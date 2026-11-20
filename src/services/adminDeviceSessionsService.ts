import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";

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

export async function loadAdminDeviceSessions(userId: string): Promise<DeviceSessionResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const sessions = await db.accountSession.findMany({
      where: { userId },
      orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
      take: 12,
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
