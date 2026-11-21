import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { onlinePresenceWindowSeconds } from "@/lib/onlinePresence";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";
import type { PublicEnvironment } from "@/lib/stagingSafety";

import {
  buildAdminOnlineUsersSnapshot,
  type RawPresenceRow,
  type AdminOnlineUsersSnapshot,
} from "@/lib/adminOnlineUsersSnapshot";

const maxObservations = 20000;

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

export type { OnlineIdentityRow, AdminOnlineUsersSnapshot } from "@/lib/adminOnlineUsersSnapshot";
