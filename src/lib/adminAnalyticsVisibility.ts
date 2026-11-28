import { Prisma } from "@/generated/prisma/client";
import { optionalAnalyticsPurpose } from "./activityTrackingContract";

// These historical event types and names represented optional activity even
// before the writers began recording an explicit purpose.
const optionalTypes = ["PAGE_VIEW", "SHARE", "SEARCH", "REDIRECT"] as const;
const optionalNames = ["local_saved", "local_unsaved"];

export function visitorFreeAccountAnalyticsWhere(): Prisma.AnalyticsEventWhereInput {
  return {
    visitorId: null,
    type: { notIn: [...optionalTypes] },
    name: { notIn: optionalNames },
    OR: [
      { metadata: { path: ["recordPurpose"], equals: Prisma.AnyNull } },
      { metadata: { path: ["recordPurpose"], not: optionalAnalyticsPurpose } },
    ],
  };
}

/** Matches the registered reader for direct events. The eligible Visitor
 * join keeps consent and original ownership in the same query snapshot. */
export function directAccountAnalyticsSql(environment: "staging" | "production", bounds?: { from: Date; to?: Date }) {
  return Prisma.sql`
    SELECT e."createdAt" FROM "AnalyticsEvent" e
    LEFT JOIN "Visitor" v ON v."id" = e."visitorId" AND v."currentUserId" = u."id"
      AND v."consentStatus" = 'GRANTED' AND v."trackingDisabledAt" IS NULL
      AND u."status" = 'ACTIVE' AND u."emailVerified" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "VisitorIdentityLink" l
        WHERE l."visitorId" = v."id" AND l."userId" = u."id"
      )
      AND NOT EXISTS (
        SELECT 1 FROM "VisitorIdentityLink" l
        WHERE l."visitorId" = v."id" AND l."userId" <> u."id"
      )
    WHERE e."userId" = u."id" AND e."metadata"->>'environment' = ${environment}
      ${bounds ? Prisma.sql`AND e."createdAt" >= ${bounds.from}` : Prisma.empty}
      ${bounds?.to ? Prisma.sql`AND e."createdAt" < ${bounds.to}` : Prisma.empty}
      AND (
        v."id" IS NOT NULL OR (
          e."visitorId" IS NULL
          AND e."type"::text NOT IN (${Prisma.join([...optionalTypes])})
          AND e."name" NOT IN (${Prisma.join(optionalNames)})
          AND (e."metadata"->>'recordPurpose') IS DISTINCT FROM ${optionalAnalyticsPurpose}
        )
      )
  `;
}
