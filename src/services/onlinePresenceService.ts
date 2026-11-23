import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { onlinePresenceWindowSeconds, type OnlinePresenceSnapshot } from "@/lib/onlinePresence";
import { hasConsistentWebsitePresenceOrigin, presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import type { OnlinePresenceHeartbeat } from "@/lib/onlinePresenceRoute";
import type { PublicEnvironment } from "@/lib/stagingSafety";

const retainedForMs = 15 * 60_000;
const writeThrottleMs = 20_000;
const cleanupIntervalMs = 60_000;
const cleanupAgainAt: Record<PublicEnvironment, number> = { staging: 0, production: 0 };

const presenceHealth = globalThis as typeof globalThis & {
  onlinePresenceFailedThrough?: Partial<Record<PublicEnvironment, number>>;
};

export function reportOnlinePresenceIngestionFailure(environment: PublicEnvironment) {
  const failures = presenceHealth.onlinePresenceFailedThrough ??= {};
  // Keep the reported failure through the client's Retry-After and next attempt.
  failures[environment] = Date.now() + onlinePresenceWindowSeconds * 1000;
}

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

async function writeOnlinePresence(db: Prisma.TransactionClient, { environment, sourceId, platform, accountSessionId, now }: OnlinePresenceHeartbeat) {
  const writeBefore = new Date(now.getTime() - writeThrottleMs);

  // The same credential has one mutable row. Preserve a newer account/guest
  // state if responses arrive out of order, and suppress redundant writes.
  return db.$executeRaw`
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
}

export async function recordOnlinePresence(heartbeat: OnlinePresenceHeartbeat) {
  const db = getOptionalPrisma();
  if (!db) throw new Error("Online presence storage unavailable");
  await writeOnlinePresence(db, heartbeat);
  await pruneExpiredPresence(heartbeat.environment, heartbeat.now);
}

export async function getOnlinePresenceSnapshot(
  environment: PublicEnvironment,
  now = new Date(),
  browserReferrer?: string,
): Promise<OnlinePresenceSnapshot> {
  const window = { windowSeconds: onlinePresenceWindowSeconds, observedAt: now.toISOString() };
  const unavailable: OnlinePresenceSnapshot = { status: "unavailable", ...window };
  if (!isDatabaseConfigured() || !presenceSigningSecret()) {
    return { status: "not_configured", ...window };
  }
  if (!hasConsistentWebsitePresenceOrigin(process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL, browserReferrer)
      || now.getTime() < (presenceHealth.onlinePresenceFailedThrough?.[environment] ?? 0)) return unavailable;
  const cutoff = new Date(now.getTime() - onlinePresenceWindowSeconds * 1000);

  try {
    const db = getOptionalPrisma();
    if (!db) return unavailable;
    const sourceId = "probe:" + randomUUID();
    const [row] = await db.$transaction(async tx => {
      // Exercise heartbeat inserts and renewal writes. The synthetic
      // row stays private to this transaction and is removed before counting.
      const probe = { environment, sourceId, platform: "desktop_web", accountSessionId: null } as const;
      const inserted = await writeOnlinePresence(tx, { ...probe, now: new Date(now.getTime() - writeThrottleMs) });
      const renewed = await writeOnlinePresence(tx, { ...probe, now });
      if (inserted !== 1 || renewed !== 1) throw new Error("Online presence probe could not be written");
      const removed = await tx.$executeRaw`
        DELETE FROM "OnlinePresenceSession" WHERE "environment" = ${environment} AND "sourceId" = ${sourceId}
      `;
      if (removed !== 1) throw new Error("Online presence probe could not be removed");
      return tx.$queryRaw<Array<{ registered: bigint; guests: bigint }>>`
        SELECT
          COUNT(DISTINCT u."id") FILTER (
            WHERE u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
              AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
              AND s."sessionVersion" = u."sessionVersion"
              AND (NOT COALESCE(security."twoFactorEnabled", false) OR s."assuranceLevel" <> 'PRIMARY')
          ) AS "registered",
          COUNT(*) FILTER (WHERE p."accountSessionId" IS NULL) AS "guests"
        FROM "OnlinePresenceSession" p
        LEFT JOIN "AccountSession" s ON s."id" = p."accountSessionId"
        LEFT JOIN "User" u ON u."id" = s."userId"
        LEFT JOIN "UserSecuritySettings" security ON security."userId" = u."id"
        WHERE p."environment" = ${environment} AND p."lastSeenAt" > ${cutoff} AND p."lastSeenAt" <= ${now}
      `;
    });
    await pruneExpiredPresence(environment, now);
    if (!row) return unavailable;
    const registeredAccounts = Number(row.registered);
    const guestSessions = Number(row.guests);
    const total = registeredAccounts + guestSessions;
    if (![registeredAccounts, guestSessions, total].every(value => Number.isSafeInteger(value) && value >= 0)) return unavailable;
    return { status: "ok", total, registeredAccounts, guestSessions, ...window };
  } catch {
    return unavailable;
  }
}
