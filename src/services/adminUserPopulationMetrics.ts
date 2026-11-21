import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { withOptionalDb } from "@/lib/prisma";
import { adminIdentityDateBounds, type AdminIdentityDate } from "@/lib/adminIdentityDirectory";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type UserPopulationMetrics = {
  total: number;
  registered: number;
  guests: number;
  newRegistrations: number;
  newGuests: number;
  /** Guests consist of consented unlinked visitor identities plus unattributed operational sessions. */
  consentedGuests: number;
  operationalGuestSessions: number;
  environment: PublicEnvironment;
};

/** Population is independent of directory search, role and status filters.
 * A directory activity window MUST NOT be mistaken for a signup date window.
 * Operational anonymous sessions cannot establish unique people or downloads.
 */
export async function readUserPopulationMetrics(
  date: AdminIdentityDate, environment: PublicEnvironment, now = new Date(),
  from?: string, to?: string,
): Promise<UserPopulationMetrics | null> {
  const bounds = adminIdentityDateBounds(date, now, from, to);
  const period = bounds ? { gte: bounds.from, ...(bounds.to ? { lt: bounds.to } : {}) } : undefined;
  return withOptionalDb<UserPopulationMetrics | null>(async db => {
    const eligibleGuests = {
      consentStatus: "GRANTED" as const,
      trackingDisabledAt: null,
      currentUserId: null,
      identityLinks: { none: {} },
    };
    // The operational identifier is an opaque UUID attached only to unlinked,
    // unattributed search/handoff records in the selected deployment.
    // First seen is calculated across all history before applying the new-guest window.
    const [registered, newRegistrations, consentedGuests, newConsentedGuests, anonymous] = await Promise.all([
      db.user.count(),
      db.user.count({ where: period ? { createdAt: period } : {} }),
      db.visitor.count({ where: eligibleGuests }),
      db.visitor.count({ where: { ...eligibleGuests, ...(period ? { firstSeenAt: period } : {}) } }),
      db.$queryRaw<Array<{ total: bigint; recent: bigint }>>(Prisma.sql`
        WITH recorded AS (
          SELECT s."query"->>'operationalSessionId' AS "sessionId", s."createdAt" AS "seenAt"
          FROM "SearchHistory" s
          WHERE s."userId" IS NULL AND s."visitorId" IS NULL
            AND s."query"->>'environment' = ${environment}
          UNION ALL
          SELECT r."metadata"->>'operationalSessionId' AS "sessionId", r."createdAt" AS "seenAt"
          FROM "RedirectLog" r
          WHERE r."userId" IS NULL AND r."visitorId" IS NULL
            AND r."metadata"->>'environment' = ${environment}
        ), sessions AS (
          SELECT "sessionId", MIN("seenAt") AS "firstSeenAt"
          FROM recorded
          WHERE "sessionId" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          GROUP BY "sessionId"
        )
        SELECT COUNT(*)::bigint AS "total",
          ${bounds ? Prisma.sql`COUNT(*) FILTER (WHERE "firstSeenAt" >= ${bounds.from} ${bounds.to ? Prisma.sql`AND "firstSeenAt" < ${bounds.to}` : Prisma.empty})::bigint` : Prisma.sql`COUNT(*)::bigint`} AS "recent"
        FROM sessions
      `),
    ]);
    if (anonymous.length !== 1) return null;
    const operationalGuestSessions = Number(anonymous[0].total);
    const newOperationalGuests = Number(anonymous[0].recent);
    const guests = consentedGuests + operationalGuestSessions;
    const newGuests = newConsentedGuests + newOperationalGuests;
    const total = registered + guests;
    const values = [registered, newRegistrations, consentedGuests, newConsentedGuests,
      operationalGuestSessions, newOperationalGuests, guests, newGuests, total];
    if (!values.every(value => Number.isSafeInteger(value) && value >= 0)
      || newRegistrations > registered || newConsentedGuests > consentedGuests
      || newOperationalGuests > operationalGuestSessions || newGuests > guests) return null;
    return { total, registered, guests, newRegistrations, newGuests,
      consentedGuests, operationalGuestSessions, environment };
  }, null);
}
