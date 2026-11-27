import "server-only";

import { randomUUID } from "node:crypto";
import { getOptionalPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { onlinePresenceWindowSeconds, type OnlinePresenceSnapshot } from "@/lib/onlinePresence";
import { hasConsistentWebsitePresenceOrigin, presenceSigningSecret } from "@/lib/onlinePresenceCredential";
import type { OnlinePresenceHeartbeat } from "@/lib/onlinePresenceRoute";
import { guestFirstAccessPreviewEnabled } from "@/lib/guestFirstAccessObservation";
import { guestLiveCountryEnabled } from "@/lib/guestLiveCountry";
import { writeGuestPresenceDetails } from "@/lib/liveGuestPresenceWrite";
import { writeOnlinePresence } from "@/lib/onlinePresenceWrite";
import { recheckGuestPresenceActivityIdentity } from "@/services/guestPresenceActivityIdentity";
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
  // Stale preview fields must not remain on a row kept alive by an account
  // or a disabled preview. Keep this separate from canonical retention and
  // tolerate a not-yet-applied additive migration.
  if (environment === "staging") {
    try {
      const cutoff = new Date(+now - retainedForMs);
      await db.$executeRaw`
        UPDATE "OnlinePresenceSession"
        SET "guestFirstSeenAt" = NULL, "guestObservedAt" = NULL,
          "guestCountryCode" = NULL, "guestDeviceLabel" = NULL,
          "guestBrowser" = NULL, "guestOs" = NULL
        WHERE ("environment", "sourceId") IN (
          SELECT "environment", "sourceId" FROM "OnlinePresenceSession"
          WHERE "environment" = ${environment} AND "guestObservedAt" IS NOT NULL
            AND ("accountSessionId" IS NOT NULL
              OR "guestObservedAt" <> "lastSeenAt"
              OR "guestObservedAt" < ${cutoff}
              OR ${!guestFirstAccessPreviewEnabled(environment)})
          ORDER BY "guestObservedAt" LIMIT 10000 FOR UPDATE SKIP LOCKED
        )
      `;
    } catch {
      // Do not alter canonical presence when optional preview storage fails.
    }
    try {
      const cutoff = new Date(+now - retainedForMs);
      await db.$executeRaw`
        UPDATE "OnlinePresenceSession"
        SET "guestLiveCountryCode" = NULL, "guestLiveCountryObservedAt" = NULL
        WHERE ("environment", "sourceId") IN (
          SELECT "environment", "sourceId" FROM "OnlinePresenceSession"
          WHERE "environment" = ${environment} AND "guestLiveCountryObservedAt" IS NOT NULL
            AND ("accountSessionId" IS NOT NULL
              OR "guestLiveCountryObservedAt" <> "lastSeenAt"
              OR "guestLiveCountryObservedAt" < ${cutoff}
              OR ${!guestLiveCountryEnabled(environment)})
          ORDER BY "guestLiveCountryObservedAt" LIMIT 10000 FOR UPDATE SKIP LOCKED
        )
      `;
    } catch {
      // Country is optional; canonical presence remains available.
    }
    try {
      const cutoff = new Date(+now - onlinePresenceWindowSeconds * 1000);
      await db.$executeRaw`
        UPDATE "OnlinePresenceSession"
        SET "guestActivityKind" = NULL, "guestActivityId" = NULL,
          "guestActivityObservedAt" = NULL, "guestActivityExpiresAt" = NULL
        WHERE ("environment", "sourceId") IN (
          SELECT "environment", "sourceId" FROM "OnlinePresenceSession"
          WHERE "environment" = ${environment} AND "guestActivityObservedAt" IS NOT NULL
            AND ("accountSessionId" IS NOT NULL
              OR "guestActivityObservedAt" <> "lastSeenAt"
              OR "lastSeenAt" <= ${cutoff}
              OR "guestActivityExpiresAt" <= ${now})
          ORDER BY "guestActivityObservedAt" LIMIT 10000 FOR UPDATE SKIP LOCKED
        )
      `;
    } catch {
      // Read-time freshness and consent checks never depend on this cleanup.
    }
  }
}

export async function recordOnlinePresence(heartbeat: OnlinePresenceHeartbeat) {
  const db = getOptionalPrisma();
  if (!db) throw new Error("Online presence storage unavailable");
  if (heartbeat.environment === "staging") {
    try {
      await db.$transaction(async tx => {
        const guestActivity = heartbeat.accountSessionId === null
          ? await recheckGuestPresenceActivityIdentity(tx, heartbeat.guestActivity ?? null, heartbeat.now) : null;
        await writeGuestPresenceDetails(tx, { ...heartbeat, guestActivity });
      });
    }
    catch {
      console.warn("[online-presence] optional guest observation unavailable");
      // Advance the canonical observation even inside the normal throttle so
      // an older optional tuple no longer matches the accepted heartbeat.
      await writeOnlinePresence(db, heartbeat, true);
    }
  } else await writeOnlinePresence(db, heartbeat);
  // Device context is an optional enhancement to an authenticated canonical
  // session. Guest ownership is separately verified above and never creates
  // a visitor, historical activity event, or new persistent credential.
  if (heartbeat.accountSessionId && heartbeat.device) {
    const minuteAgo = new Date(heartbeat.now.getTime() - 60_000);
    try {
      await db.accountSession.updateMany({
        where: {
          id: heartbeat.accountSessionId,
          revokedAt: null,
          expiresAt: { gt: heartbeat.now },
          OR: [{ lastSeenAt: { lt: minuteAgo } }, { deviceLabel: null }],
        },
        data: {
          lastSeenAt: heartbeat.now,
          ...(heartbeat.device.deviceLabel ? { deviceLabel: heartbeat.device.deviceLabel } : {}),
          ...(heartbeat.device.browser ? { browser: heartbeat.device.browser } : {}),
          ...(heartbeat.device.os ? { os: heartbeat.device.os } : {}),
          ...(heartbeat.device.locationLabel ? { locationLabel: heartbeat.device.locationLabel } : {}),
        },
      });
    } catch {
      // Optional device details must never break operational presence accounting.
      console.warn("[online-presence] session device observation unavailable");
    }
  }
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
      return tx.$queryRaw<Array<{
        registered: bigint; guests: bigint;
        desktop_web: bigint; mobile_web: bigint; ios: bigint; android: bigint;
        website: bigint; unclassified: bigint;
      }>>`
        WITH observed AS (
          -- Verified accounts of all roles share the same user ID across
          -- admin, customer web and native sessions; count each once overall.
          SELECT p."platform", p."accountSessionId",
            CASE WHEN u."status" = 'ACTIVE' AND u."role" IN ('USER', 'SUPPORT', 'ADMIN')
                AND u."emailVerified" IS NOT NULL
                AND s."revokedAt" IS NULL AND s."expiresAt" > ${now}
                AND s."sessionVersion" = u."sessionVersion"
                AND (NOT COALESCE(security."twoFactorEnabled", false) OR s."assuranceLevel" <> 'PRIMARY')
              THEN u."id" ELSE NULL END AS "registeredUserId"
          FROM "OnlinePresenceSession" p
          LEFT JOIN "AccountSession" s ON s."id" = p."accountSessionId"
          LEFT JOIN "User" u ON u."id" = s."userId"
          LEFT JOIN "UserSecuritySettings" security ON security."userId" = u."id"
          WHERE p."environment" = ${environment}
            AND p."lastSeenAt" > ${cutoff} AND p."lastSeenAt" <= ${now}
        )
        SELECT
          COUNT(DISTINCT "registeredUserId") AS "registered",
          COUNT(*) FILTER (WHERE "accountSessionId" IS NULL) AS "guests",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" = 'desktop_web')
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL AND "platform" = 'desktop_web')) AS "desktop_web",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" = 'mobile_web')
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL AND "platform" = 'mobile_web')) AS "mobile_web",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" = 'ios')
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL AND "platform" = 'ios')) AS "ios",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" = 'android')
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL AND "platform" = 'android')) AS "android",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" IN ('desktop_web', 'mobile_web'))
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL
              AND "platform" IN ('desktop_web', 'mobile_web'))) AS "website",
          (COUNT(DISTINCT "registeredUserId") FILTER (WHERE "platform" IS NULL OR "platform" NOT IN ('desktop_web', 'mobile_web', 'ios', 'android'))
            + COUNT(*) FILTER (WHERE "accountSessionId" IS NULL AND ("platform" IS NULL OR "platform" NOT IN ('desktop_web', 'mobile_web', 'ios', 'android')))) AS "unclassified"
        FROM observed
      `;
    });
    await pruneExpiredPresence(environment, now);
    if (!row) return unavailable;
    const registeredAccounts = Number(row.registered);
    const guestSessions = Number(row.guests);
    const total = registeredAccounts + guestSessions;
    const platforms = {
      desktop_web: Number(row.desktop_web), mobile_web: Number(row.mobile_web),
      ios: Number(row.ios), android: Number(row.android), website: Number(row.website),
      unclassified: Number(row.unclassified),
    };
    const measures = [registeredAccounts, guestSessions, total, ...Object.values(platforms)];
    const platformSum = Object.values(platforms).reduce((sum, count) => sum + count, 0);
    if (!measures.every(value => Number.isSafeInteger(value) && value >= 0)
        || !Number.isSafeInteger(platformSum) || platformSum < total
        || Object.values(platforms).some(value => value > total)
        || platforms.website < Math.max(platforms.desktop_web, platforms.mobile_web)
        || platforms.website > platforms.desktop_web + platforms.mobile_web
        || platforms.website + platforms.ios + platforms.android + platforms.unclassified < total) return unavailable;
    return { status: "ok", total, registeredAccounts, guestSessions, platforms, ...window };
  } catch {
    return unavailable;
  }
}
