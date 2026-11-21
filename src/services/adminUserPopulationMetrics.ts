import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { withOptionalDb } from "@/lib/prisma";
import { adminIdentityDateBounds, type AdminIdentityDate } from "@/lib/adminIdentityDirectory";

export type UserPopulationMetrics = {
  /** Durable accounts and consented, unlinked visitor identities; not distinct people. */
  total: number;
  registered: number;
  guests: number;
  newRegistrations: number;
  newGuests: number;
};

/**
 * One PostgreSQL statement provides all population counts in the same MVCC
 * snapshot. This prevents a simultaneous signup from making "new" exceed
 * "total". A single read also avoids repeating the directory's unbounded
 * SearchHistory / RedirectLog aggregation on every request.
 *
 * Guest counts intentionally include only eligible first-party Visitor
 * identities. Anonymous operational search-session IDs remain available in
 * the directory, but are not reliable distinct-person population metrics.
 *
 * Directory activity filters do not redefine the registration/first-seen
 * time window used here.
 */
export async function readUserPopulationMetrics(
  date: AdminIdentityDate, now = new Date(), from?: string, to?: string,
): Promise<UserPopulationMetrics | null> {
  const bounds = adminIdentityDateBounds(date, now, from, to);
  const newlyRegistered = bounds ? Prisma.sql`
    COUNT(*) FILTER (WHERE "createdAt" >= ${bounds.from}
      ${bounds.to ? Prisma.sql`AND "createdAt" < ${bounds.to}` : Prisma.empty})::bigint
  ` : Prisma.sql`COUNT(*)::bigint`;
  const newlyObservedGuests = bounds ? Prisma.sql`
    COUNT(*) FILTER (WHERE v."firstSeenAt" >= ${bounds.from}
      ${bounds.to ? Prisma.sql`AND v."firstSeenAt" < ${bounds.to}` : Prisma.empty})::bigint
  ` : Prisma.sql`COUNT(*)::bigint`;

  return withOptionalDb<UserPopulationMetrics | null>(async db => {
    const rows = await db.$queryRaw<Array<{
      registered: bigint;
      newRegistrations: bigint;
      guests: bigint;
      newGuests: bigint;
    }>>(Prisma.sql`
      SELECT accounts."registered", accounts."newRegistrations",
        guest_identities."guests", guest_identities."newGuests"
      FROM (
        SELECT COUNT(*)::bigint AS "registered",
          ${newlyRegistered} AS "newRegistrations"
        FROM "User"
      ) accounts
      CROSS JOIN (
        SELECT COUNT(*)::bigint AS "guests",
          ${newlyObservedGuests} AS "newGuests"
        FROM "Visitor" v
        WHERE v."consentStatus" = 'GRANTED'
          AND v."trackingDisabledAt" IS NULL
          AND v."currentUserId" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "VisitorIdentityLink" link
            WHERE link."visitorId" = v."id"
          )
      ) guest_identities
    `);
    if (rows.length !== 1) return null;
    const registered = Number(rows[0].registered);
    const guests = Number(rows[0].guests);
    const newRegistrations = Number(rows[0].newRegistrations);
    const newGuests = Number(rows[0].newGuests);
    const total = registered + guests;
    if (![registered, guests, newRegistrations, newGuests, total]
      .every(value => Number.isSafeInteger(value) && value >= 0)
      || newRegistrations > registered || newGuests > guests) return null;
    return { total, registered, guests, newRegistrations, newGuests };
  }, null);
}
