import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { hashVisitorToken, isVisitorToken } from "@/lib/visitor-identity";
import { websitePresenceWindowSeconds, mayRecordWebsitePresence, checkedPresenceCount } from "@/lib/website-presence";
import { isEligibleVisitorAccount, lockVisitorAccount, lockVisitorCredential } from "@/services/visitorActivityIdentity";

type PresenceResult = {
  status: "ok";
  total: number;
  registeredAccounts: number;
  guestIdentities: number;
  windowSeconds: number;
  observedAt: string;
} | { status: "unavailable"; windowSeconds: number; observedAt: string };

/**
 * No records are created without the existing, valid HttpOnly visitor credential
 * and a persisted analytics grant. The authenticated account is resolved on the
 * server, never supplied in the request body.
 */
export async function recordWebsitePresenceHeartbeat(token: string | null, userId: string | null) {
  if (!isVisitorToken(token)) return "not_tracked" as const;
  const db = getOptionalPrisma();
  if (!db) return "unavailable" as const;
  try {
    const tokenHash = hashVisitorToken(token);
    return await db.$transaction(async tx => {
      if (userId && !isEligibleVisitorAccount(await lockVisitorAccount(tx, userId))) return "not_tracked" as const;

      // Serialise with consent withdrawal and account changes; hold the visitor
      // row lock until the timestamp is written.
      await lockVisitorCredential(tx, tokenHash);
      const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Visitor" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      if (rows.length !== 1) return "not_tracked" as const;
      const visitor = await tx.visitor.findUnique({
        where: { id: rows[0].id },
        select: { id: true, currentUserId: true, consentStatus: true, trackingDisabledAt: true, identityLinks: { select: { userId: true } } },
      });
      if (!mayRecordWebsitePresence(visitor, userId)) return "not_tracked" as const;

      const updated = await tx.visitor.updateMany({
        where: { id: visitor!.id, consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: userId },
        data: { websitePresenceAt: new Date(), websitePresenceEnvironment: getPublicEnvironment() },
      });
      return updated.count === 1 ? "recorded" as const : "not_tracked" as const;
    }, { isolationLevel: "ReadCommitted", timeout: 5000 });
  } catch {
    // Optional telemetry must never interrupt browsing or disclose credentials.
    return "unavailable" as const;
  }
}

/**
 * Measures only consented, foreground website browser heartbeats in this exact
 * deployment environment. Signed-in users are deduplicated by verified account
 * ID, and anonymous browser identities by Visitor.id. Counts exclude native
 * traffic, declined analytics, stale identities, and non-active accounts.
 */
export async function getWebsitePresenceSnapshot(
  environment: PublicEnvironment,
  now = new Date(),
): Promise<PresenceResult> {
  const observedAt = now.toISOString();
  const unavailable = () => ({ status: "unavailable" as const, windowSeconds: websitePresenceWindowSeconds, observedAt });
  const db = getOptionalPrisma();
  if (!db) return unavailable();
  const cutoff = new Date(now.getTime() - websitePresenceWindowSeconds * 1000);

  try {
    const [row] = await db.$queryRaw<Array<{ registered: bigint; guests: bigint }>>`
      SELECT
        COUNT(DISTINCT CASE WHEN v."currentUserId" IS NOT NULL THEN v."currentUserId" END) AS "registered",
        COUNT(DISTINCT CASE WHEN v."currentUserId" IS NULL THEN v."id" END) AS "guests"
      FROM "Visitor" v
      LEFT JOIN "User" u ON u."id" = v."currentUserId"
      WHERE v."consentStatus" = 'GRANTED'
        AND v."trackingDisabledAt" IS NULL
        AND v."websitePresenceEnvironment" = ${environment}
        AND v."websitePresenceAt" >= ${cutoff}
        AND v."websitePresenceAt" <= ${now}
        AND (
          (v."currentUserId" IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM "VisitorIdentityLink" l WHERE l."visitorId" = v."id"
            ))
          OR
          (v."currentUserId" IS NOT NULL
            AND u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM "VisitorIdentityLink" l
              WHERE l."visitorId" = v."id" AND l."userId" = v."currentUserId"
            )
            AND NOT EXISTS (
              SELECT 1 FROM "VisitorIdentityLink" l
              WHERE l."visitorId" = v."id" AND l."userId" <> v."currentUserId"
            ))
        )
    `;
    if (!row) return unavailable();
    const registeredAccounts = checkedPresenceCount(row.registered);
    const guestIdentities = checkedPresenceCount(row.guests);
    const total = checkedPresenceCount(registeredAccounts + guestIdentities);
    return { status: "ok", total, registeredAccounts, guestIdentities, windowSeconds: websitePresenceWindowSeconds, observedAt };
  } catch {
    // Before migration or during an outage: show Unavailable, never a false zero.
    return unavailable();
  }
}
