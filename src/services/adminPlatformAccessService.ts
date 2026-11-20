import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { deviceHistoryWindow } from "@/lib/adminDeviceHistory";

export const PLATFORM_ACCESS_PAGE_SIZE = 20;
export type PlatformAccessRange = "today" | "7d" | "30d" | "all";
export type PlatformAccessFilter = "all" | "web" | "ios" | "android" | "other";
export type PlatformAccessQuery = { range: PlatformAccessRange; platform: PlatformAccessFilter; page: number };

export function parsePlatformAccessQuery(raw: Record<string, string | string[] | undefined>) {
  if (Object.values(raw).some(Array.isArray)) return null;
  const range = raw.range ?? "today";
  const platform = raw.platform ?? "all";
  const page = raw.page ?? "1";
  if (!["today", "7d", "30d", "all"].includes(String(range))
    || !["all", "web", "ios", "android", "other"].includes(String(platform))
    || typeof page !== "string" || !/^[1-9]\d{0,5}$/.test(page)) return null;
  return { range: range as PlatformAccessRange, platform: platform as PlatformAccessFilter, page: Number(page) };
}

export function platformAccessHref(query: PlatformAccessQuery, page: number) {
  return "/admin/users/platforms-devices?" + new URLSearchParams({
    range: query.range, platform: query.platform, page: String(page),
  });
}

const category = (client: string, platform: string | null): Exclude<PlatformAccessFilter, "all"> =>
  client === "WEB" ? "web" : platform === "ios" ? "ios" : platform === "android" ? "android" : "other";

export type PlatformAccessRow = {
  id: string;
  userId: string;
  client: "WEB" | "MOBILE";
  platform: string | null;
  deviceLabel: string | null;
  os: string | null;
  browser: string | null;
  locationLabel: string | null;
  lastSeenAt: Date;
  revokedAt: Date | null;
  user: { id: string; name: string | null; email: string | null };
};
export type PlatformAccessResult = {
  status: "ok";
  total: number;
  counts: Record<Exclude<PlatformAccessFilter, "all">, number>;
  sessions: PlatformAccessRow[];
} | { status: "unavailable" };

/** Account sessions, not installed-device inventory or guest browser tracking. */
export async function loadPlatformAccess(query: PlatformAccessQuery): Promise<PlatformAccessResult> {
  try {
    const db = getOptionalPrisma();
    if (!db) return { status: "unavailable" };
    const dateFilter = deviceHistoryWindow({ range: query.range, page: 1 });
    const base = { lastSeenAt: dateFilter };
    const selection = query.platform === "web" ? { client: "WEB" as const }
      : query.platform === "ios" ? { client: "MOBILE" as const, platform: "ios" }
      : query.platform === "android" ? { client: "MOBILE" as const, platform: "android" }
      : query.platform === "other" ? {
        client: "MOBILE" as const,
        OR: [{ platform: { notIn: ["ios", "android"] } }, { platform: null }],
      } : {};
    const [groups, total, sessions] = await Promise.all([
      db.accountSession.groupBy({ by: ["client", "platform"], where: base, _count: { _all: true } }),
      db.accountSession.count({ where: { ...base, ...selection } }),
      db.accountSession.findMany({
        where: { ...base, ...selection },
        orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * PLATFORM_ACCESS_PAGE_SIZE,
        take: PLATFORM_ACCESS_PAGE_SIZE,
        select: {
          id: true, userId: true, client: true, platform: true, deviceLabel: true,
          os: true, browser: true, locationLabel: true, lastSeenAt: true, revokedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);
    const counts = { web: 0, ios: 0, android: 0, other: 0 };
    for (const group of groups) counts[category(group.client, group.platform)] += group._count._all;
    return { status: "ok", total, counts, sessions };
  } catch {
    return { status: "unavailable" };
  }
}
