import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { onlinePresenceWindowSeconds, type OnlinePresenceSnapshot } from "@/lib/onlinePresence";
import { isWebsiteOnlinePresenceEnabled, presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import type { OnlinePresenceHeartbeat } from "@/lib/onlinePresenceRoute";
import type { PublicEnvironment } from "@/lib/stagingSafety";

const retainedForMs = 15 * 60_000;
const writeThrottleMs = 20_000;
const cleanupIntervalMs = 60_000;
const cleanupAgainAt: Record<PublicEnvironment, number> = { staging: 0, production: 0 };

async function pruneExpiredPresence(environment: PublicEnvironment, now: Date) {
  const db = getOptionalPrisma();
  if (!db || now.getTime() < cleanupAgainAt[environment]) return;
  cleanupAgainAt[environment] = now.getTime() + cleanupIntervalMs;
  try {
    const cutoff = new Date(now.getTime() - retainedForMs);
    await db.$executeRaw`
      DELETE FROM "OnlinePresenceSession"
      WHERE ("environment", "sourceId") IN (
        SELECT "environment", "sourceId"
        FROM "OnlinePresenceSession"
        WHERE "environment" = ${environment} AND "lastSeenAt" < ${cutoff}
        ORDER BY "lastSeenAt"
        LIMIT 10000
        FOR UPDATE SKIP LOCKED
      )
    `;
  } catch {
    // Retention work is best-effort on this request and retried by the next sweep.
    // Exclusion from the rolling snapshot never depends on a physical deletion.
    console.warn("[online-presence] expired session cleanup failed");
  }
}

export async function recordOnlinePresence({ environment, sourceId, platform, accountSessionId, now }: OnlinePresenceHeartbeat) {
  const db = getOptionalPrisma();
  if (!db) throw new Error("Online presence storage unavailable");
  const writeBefore = new Date(now.getTime() - writeThrottleMs);

  // The same credential has one mutable row. Preserve a newer account/guest
  // state if responses arrive out of order, and suppress redundant writes.
  await db.$executeRaw`
    INSERT INTO "OnlinePresenceSession" AS current
      ("environment", "sourceId", "platform", "accountSessionId", "lastSeenAt")
    VALUES (${environment}, ${sourceId}, ${platform}, ${accountSessionId}, ${now})
    ON CONFLICT ("environment", "sourceId") DO UPDATE SET
      "platform" = EXCLUDED."platform",
      "accountSessionId" = EXCLUDED."accountSessionId",
      "lastSeenAt" = EXCLUDED."lastSeenAt"
    WHERE current."lastSeenAt" <= EXCLUDED."lastSeenAt"
      AND (current."lastSeenAt" <= ${writeBefore}
        OR current."accountSessionId" IS DISTINCT FROM EXCLUDED."accountSessionId"
        OR current."platform" IS DISTINCT FROM EXCLUDED."platform")
  `;
  await pruneExpiredPresence(environment, now);
}

export async function getOnlinePresenceSnapshot(environment: PublicEnvironment, now = new Date()): Promise<OnlinePresenceSnapshot> {
  const window = { windowSeconds: onlinePresenceWindowSeconds, observedAt: now.toISOString() };
  const unavailable: OnlinePresenceSnapshot = { status: "unavailable", ...window };
  const db = getOptionalPrisma();
  if (!db || !presenceSigningSecret() || !isWebsiteOnlinePresenceEnabled()) return unavailable;
  const cutoff = new Date(now.getTime() - onlinePresenceWindowSeconds * 1000);

  try {
    const [row] = await db.$queryRaw<Array<{ registered: bigint; guests: bigint; receiving: boolean; writable: boolean }>>`
      SELECT
        COUNT(DISTINCT u."id") FILTER (
          WHERE u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
            AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
            AND s."sessionVersion" = u."sessionVersion"
            AND (NOT COALESCE(security."twoFactorEnabled", false) OR s."assuranceLevel" <> 'PRIMARY')
        ) AS "registered",
        COUNT(*) FILTER (WHERE p."accountSessionId" IS NULL) AS "guests",
        (COUNT(*) > 0) AS "receiving",
        (current_setting('transaction_read_only') = 'off'
          AND has_table_privilege('"OnlinePresenceSession"', 'INSERT')
          AND has_table_privilege('"OnlinePresenceSession"', 'UPDATE')) AS "writable"
      FROM "OnlinePresenceSession" p
      LEFT JOIN "AccountSession" s ON s."id" = p."accountSessionId"
      LEFT JOIN "User" u ON u."id" = s."userId"
      LEFT JOIN "UserSecuritySettings" security ON security."userId" = u."id"
      WHERE p."environment" = ${environment} AND p."lastSeenAt" > ${cutoff} AND p."lastSeenAt" <= ${now}
    `;
    await pruneExpiredPresence(environment, now);
    if (!row?.receiving || !row.writable) return unavailable;
    const registeredAccounts = Number(row.registered);
    const guestSessions = Number(row.guests);
    const total = registeredAccounts + guestSessions;
    if (![registeredAccounts, guestSessions, total].every(value => Number.isSafeInteger(value) && value >= 0)) return unavailable;
    return { status: "ok", total, registeredAccounts, guestSessions, ...window };
  } catch {
    return unavailable;
  }
}
