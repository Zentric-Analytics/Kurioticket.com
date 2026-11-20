import { Prisma } from "@/generated/prisma/client";
import type { AdminHandoffScope } from "./adminOperationalReadContract";
import type { PublicEnvironment } from "@/lib/stagingSafety";

/**
 * A server-issued operational search session is evidence of a guest, even
 * without optional analytics consent. Do not treat arbitrary metadata as one.
 * The same UUIDv4 test is used by the Users operational guest directory.
 */
const sessionUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function handoffOperationalSessionId(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).operationalSessionId;
  return typeof value === "string" && sessionUuid.test(value) ? value : null;
}

export type HandoffEvidenceRow = { id: string; createdAt: Date; searchHistoryId: string | null };

const sessionEvidence = Prisma.sql`COALESCE(
  r."metadata"->>'operationalSessionId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
const eligibleVisitor = Prisma.sql`EXISTS (
  SELECT 1 FROM "Visitor" v WHERE v."id" = r."visitorId"
    AND v."consentStatus"::text = 'GRANTED'
    AND v."trackingDisabledAt" IS NULL
)`;

/**
 * Server-verified direct correlation does not require a consented journey:
 * exactly the same opaque request UUID, environment, product and owner, plus
 * a registered account, consented visitor or matching operational session.
 * Never infer a search from provider, route or creation time.
 */
function verifiedSearchJoin(): Prisma.Sql {
  return Prisma.sql`LEFT JOIN LATERAL (
    SELECT COALESCE(
      (SELECT e."searchHistoryId" FROM "JourneyEvent" e
        WHERE e."redirectLogId" = r."id"
          AND e."type"::text = 'PROVIDER_HANDOFF_STARTED'
          AND e."searchHistoryId" IS NOT NULL LIMIT 1),
      (SELECT s."id" FROM "SearchHistory" s
        WHERE r."metadata"->>'requestId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND s."requestId" = r."metadata"->>'requestId'
          AND s."query"->>'environment' = r."metadata"->>'environment'
          AND s."type"::text = r."type"::text
          AND s."userId" IS NOT DISTINCT FROM r."userId"
          AND s."visitorId" IS NOT DISTINCT FROM r."visitorId"
          AND (
            r."userId" IS NOT NULL
            OR ${eligibleVisitor}
            OR (${sessionEvidence} AND s."query"->>'operationalSessionId' = r."metadata"->>'operationalSessionId')
          )
          AND (r."userId" IS NOT NULL OR r."visitorId" IS NULL OR ${eligibleVisitor})
        LIMIT 1)
    ) AS "searchHistoryId"
  ) correlation ON TRUE`;
}

/** Consistent scope, identity and correlation filters BEFORE keyset paging. */
export function handoffEvidenceListSql(scope: AdminHandoffScope, cursor: { at: string; id: string } | null, limit: number): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`r."metadata"->>'environment' = ${scope.environment}`];
  if (scope.product) clauses.push(Prisma.sql`r."type"::text = ${scope.product}`);
  if (scope.provider) clauses.push(Prisma.sql`lower(r."provider") = lower(${scope.provider})`);
  if (scope.from) clauses.push(Prisma.sql`r."createdAt" >= ${new Date(scope.from)}`);
  if (scope.to) clauses.push(Prisma.sql`r."createdAt" < ${new Date(scope.to)}`);
  if (scope.sourcePage) {
    const paths = [scope.sourcePage, ...(scope.sourcePage.slice(1).includes("/") ? [] : [scope.sourcePage.slice(1)])];
    clauses.push(Prisma.sql`(${Prisma.join(paths.map(path => Prisma.sql`(
      r."sourcePage" = ${path}
      OR starts_with(r."sourcePage", ${path + "?"})
      OR starts_with(r."sourcePage", ${path + "#"})
    )`), " OR ")})`);
  }
  if (scope.identity === "registered" && scope.userId && !scope.visitorId) {
    // Preserve pre-registration records only for exclusively linked visitors.
    clauses.push(Prisma.sql`(
      r."userId" = ${scope.userId}
      OR (r."userId" IS NULL AND EXISTS (
        SELECT 1 FROM "Visitor" v WHERE v."id" = r."visitorId"
          AND v."currentUserId" = ${scope.userId}
          AND v."consentStatus"::text = 'GRANTED'
          AND v."trackingDisabledAt" IS NULL
          AND EXISTS (SELECT 1 FROM "VisitorIdentityLink" l
            WHERE l."visitorId" = v."id" AND l."userId" = ${scope.userId})
          AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" l
            WHERE l."visitorId" = v."id" AND l."userId" <> ${scope.userId})
      ))
    )`);
  } else {
    if (scope.identity === "registered") clauses.push(Prisma.sql`r."userId" IS NOT NULL`);
    if (scope.identity === "guest") clauses.push(Prisma.sql`r."userId" IS NULL AND (${eligibleVisitor} OR ${sessionEvidence})`);
    if (scope.identity === "unattributed") clauses.push(Prisma.sql`r."userId" IS NULL
      AND NOT (${eligibleVisitor}) AND NOT (${sessionEvidence})`);
    if (scope.userId) clauses.push(Prisma.sql`r."userId" = ${scope.userId}`);
    if (scope.visitorId) clauses.push(Prisma.sql`r."visitorId" = ${scope.visitorId} AND ${eligibleVisitor}`);
  }
  if (scope.correlation === "exact") clauses.push(Prisma.sql`correlation."searchHistoryId" IS NOT NULL`);
  if (scope.correlation === "unavailable") clauses.push(Prisma.sql`correlation."searchHistoryId" IS NULL`);
  if (cursor) clauses.push(Prisma.sql`(
    r."createdAt" < ${new Date(cursor.at)}
    OR (r."createdAt" = ${new Date(cursor.at)} AND r."id" < ${cursor.id})
  )`);

  return Prisma.sql`SELECT r."id", r."createdAt", correlation."searchHistoryId"
    FROM "RedirectLog" r ${verifiedSearchJoin()}
    WHERE ${Prisma.join(clauses, " AND ")}
    ORDER BY r."createdAt" DESC, r."id" DESC
    LIMIT ${limit + 1}`;
}

export function handoffEvidenceDetailSql(id: string, environment: PublicEnvironment): Prisma.Sql {
  return Prisma.sql`SELECT correlation."searchHistoryId"
    FROM "RedirectLog" r ${verifiedSearchJoin()}
    WHERE r."id" = ${id} AND r."metadata"->>'environment' = ${environment}
    LIMIT 1`;
}
,
  FALSE
)`;
const eligibleVisitor = Prisma.sql`EXISTS (
  SELECT 1 FROM "Visitor" v WHERE v."id" = r."visitorId"
    AND v."consentStatus"::text = 'GRANTED'
    AND v."trackingDisabledAt" IS NULL
)`;

/**
 * Server-verified direct correlation does not require a consented journey:
 * exactly the same opaque request UUID, environment, product and owner, plus
 * a registered account, consented visitor or matching operational session.
 * Never infer a search from provider, route or creation time.
 */
function verifiedSearchJoin(): Prisma.Sql {
  return Prisma.sql`LEFT JOIN LATERAL (
    SELECT COALESCE(
      (SELECT e."searchHistoryId" FROM "JourneyEvent" e
        WHERE e."redirectLogId" = r."id"
          AND e."type"::text = 'PROVIDER_HANDOFF_STARTED'
          AND e."searchHistoryId" IS NOT NULL LIMIT 1),
      (SELECT s."id" FROM "SearchHistory" s
        WHERE r."metadata"->>'requestId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND s."requestId" = r."metadata"->>'requestId'
          AND s."query"->>'environment' = r."metadata"->>'environment'
          AND s."type"::text = r."type"::text
          AND s."userId" IS NOT DISTINCT FROM r."userId"
          AND s."visitorId" IS NOT DISTINCT FROM r."visitorId"
          AND (
            r."userId" IS NOT NULL
            OR ${eligibleVisitor}
            OR (${sessionEvidence} AND s."query"->>'operationalSessionId' = r."metadata"->>'operationalSessionId')
          )
          AND (r."userId" IS NOT NULL OR r."visitorId" IS NULL OR ${eligibleVisitor})
        LIMIT 1)
    ) AS "searchHistoryId"
  ) correlation ON TRUE`;
}

/** Consistent scope, identity and correlation filters BEFORE keyset paging. */
export function handoffEvidenceListSql(scope: AdminHandoffScope, cursor: { at: string; id: string } | null, limit: number): Prisma.Sql {
  const clauses: Prisma.Sql[] = [Prisma.sql`r."metadata"->>'environment' = ${scope.environment}`];
  if (scope.product) clauses.push(Prisma.sql`r."type"::text = ${scope.product}`);
  if (scope.provider) clauses.push(Prisma.sql`lower(r."provider") = lower(${scope.provider})`);
  if (scope.from) clauses.push(Prisma.sql`r."createdAt" >= ${new Date(scope.from)}`);
  if (scope.to) clauses.push(Prisma.sql`r."createdAt" < ${new Date(scope.to)}`);
  if (scope.sourcePage) {
    const paths = [scope.sourcePage, ...(scope.sourcePage.slice(1).includes("/") ? [] : [scope.sourcePage.slice(1)])];
    clauses.push(Prisma.sql`(${Prisma.join(paths.map(path => Prisma.sql`(
      r."sourcePage" = ${path}
      OR starts_with(r."sourcePage", ${path + "?"})
      OR starts_with(r."sourcePage", ${path + "#"})
    )`), " OR ")})`);
  }
  if (scope.identity === "registered" && scope.userId && !scope.visitorId) {
    // Preserve pre-registration records only for exclusively linked visitors.
    clauses.push(Prisma.sql`(
      r."userId" = ${scope.userId}
      OR (r."userId" IS NULL AND EXISTS (
        SELECT 1 FROM "Visitor" v WHERE v."id" = r."visitorId"
          AND v."currentUserId" = ${scope.userId}
          AND v."consentStatus"::text = 'GRANTED'
          AND v."trackingDisabledAt" IS NULL
          AND EXISTS (SELECT 1 FROM "VisitorIdentityLink" l
            WHERE l."visitorId" = v."id" AND l."userId" = ${scope.userId})
          AND NOT EXISTS (SELECT 1 FROM "VisitorIdentityLink" l
            WHERE l."visitorId" = v."id" AND l."userId" <> ${scope.userId})
      ))
    )`);
  } else {
    if (scope.identity === "registered") clauses.push(Prisma.sql`r."userId" IS NOT NULL`);
    if (scope.identity === "guest") clauses.push(Prisma.sql`r."userId" IS NULL AND (${eligibleVisitor} OR ${sessionEvidence})`);
    if (scope.identity === "unattributed") clauses.push(Prisma.sql`r."userId" IS NULL
      AND NOT (${eligibleVisitor}) AND NOT (${sessionEvidence})`);
    if (scope.userId) clauses.push(Prisma.sql`r."userId" = ${scope.userId}`);
    if (scope.visitorId) clauses.push(Prisma.sql`r."visitorId" = ${scope.visitorId} AND ${eligibleVisitor}`);
  }
  if (scope.correlation === "exact") clauses.push(Prisma.sql`correlation."searchHistoryId" IS NOT NULL`);
  if (scope.correlation === "unavailable") clauses.push(Prisma.sql`correlation."searchHistoryId" IS NULL`);
  if (cursor) clauses.push(Prisma.sql`(
    r."createdAt" < ${new Date(cursor.at)}
    OR (r."createdAt" = ${new Date(cursor.at)} AND r."id" < ${cursor.id})
  )`);

  return Prisma.sql`SELECT r."id", r."createdAt", correlation."searchHistoryId"
    FROM "RedirectLog" r ${verifiedSearchJoin()}
    WHERE ${Prisma.join(clauses, " AND ")}
    ORDER BY r."createdAt" DESC, r."id" DESC
    LIMIT ${limit + 1}`;
}

export function handoffEvidenceDetailSql(id: string, environment: PublicEnvironment): Prisma.Sql {
  return Prisma.sql`SELECT correlation."searchHistoryId"
    FROM "RedirectLog" r ${verifiedSearchJoin()}
    WHERE r."id" = ${id} AND r."metadata"->>'environment' = ${environment}
    LIMIT 1`;
}
