import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { eligibleLinkedVisitorWhere } from "@/lib/adminIdentityJourney";
import { isJourneySourcePath, journeySourcePath } from "@/lib/search-journey";
import type { PublicEnvironment } from "@/lib/stagingSafety";
import { classifyProviderIssue, providerSearchService } from "@/services/searchFailureDiagnostics";
import {
  encodeAdminOperationalCursor,
  parseAdminDeletionQuery,
  parseAdminHandoffQuery,
  parseAdminOperationalEnvironment,
  parseAdminOperationalId,
  parseAdminSearchQuery,
  parseAdminSupportQuery,
  type AdminDeletionListItem,
  type AdminDeletionQuery,
  type AdminDeletionScope,
  type AdminHandoffQuery,
  type AdminHandoffRead,
  type AdminHandoffScope,
  type AdminOperationalIdentity,
  type AdminOperationalList,
  type AdminOperationalResult,
  type AdminSearchDetail,
  type AdminSearchDiagnostic,
  type AdminSearchProviderDiagnostic,
  type AdminSearchQuery,
  type AdminSearchRead,
  type AdminSearchScope,
  type AdminSearchSummary,
  type AdminSupportDetail,
  type AdminSupportListItem,
  type AdminSupportQuery,
  type AdminSupportScope,
} from "./adminOperationalReadContract";

export type AdminOperationalDatabase = Pick<PrismaClient, "searchHistory" | "apiProviderLog" | "redirectLog" | "supportTicket" | "accountDeletionRequest" | "$queryRaw">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => AdminOperationalDatabase | null;
  environment: () => PublicEnvironment;
};

const searchSelect = {
  id: true, requestId: true, userId: true, visitorId: true, type: true, origin: true, destination: true,
  checkIn: true, checkOut: true, query: true, resultCount: true, latencyMs: true, status: true, createdAt: true,
  visitor: { select: { consentStatus: true, trackingDisabledAt: true } },
  journeyEvents: { where: { provider: { not: null } }, select: { provider: true }, take: 20 },
} satisfies Prisma.SearchHistorySelect;
type SearchRow = Prisma.SearchHistoryGetPayload<{ select: typeof searchSelect }>;

const handoffSelect = {
  id: true, userId: true, visitorId: true, type: true, provider: true, route: true, price: true, currency: true,
  sourcePage: true, destinationUrl: true, metadata: true, createdAt: true,
  visitor: { select: { consentStatus: true, trackingDisabledAt: true } },
  journeyEvents: { where: { searchHistoryId: { not: null } }, select: { searchHistoryId: true }, take: 1 },
} satisfies Prisma.RedirectLogSelect;
type HandoffRow = Prisma.RedirectLogGetPayload<{ select: typeof handoffSelect }>;

const supportListSelect = {
  id: true, userId: true, email: true, subject: true, category: true, status: true, priority: true, createdAt: true, updatedAt: true,
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketSelect;
type SupportListRow = Prisma.SupportTicketGetPayload<{ select: typeof supportListSelect }>;

const supportDetailSelect = {
  ...supportListSelect,
  sourceContext: true,
  user: { select: { id: true, email: true, name: true } },
  messages: { select: { id: true, author: true, body: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.SupportTicketSelect;
type SupportDetailRow = Prisma.SupportTicketGetPayload<{ select: typeof supportDetailSelect }>;

const deletionSelect = {
  id: true, userId: true, email: true, status: true, requestedAt: true, deletionScheduledAt: true, cancelledAt: true,
  completedAt: true, supportTicketId: true, adminNotificationId: true, reviewNotes: true,
  user: { select: { email: true, name: true, role: true, status: true } },
} satisfies Prisma.AccountDeletionRequestSelect;
type DeletionRow = Prisma.AccountDeletionRequestGetPayload<{ select: typeof deletionSelect }>;

function text(value: unknown, max = 256) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null : null;
}

function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function identity(userId: string | null, visitorId: string | null): AdminOperationalIdentity {
  return { kind: userId ? "registered" : visitorId ? "guest" : "unattributed", userId, visitorId };
}

function attributableVisitorId(
  visitorId: string | null,
  visitor: { consentStatus: string; trackingDisabledAt: Date | null } | null,
) {
  return visitorId && visitor?.consentStatus === "GRANTED" && visitor.trackingDisabledAt === null ? visitorId : null;
}

function safeDomain(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.hostname.slice(0, 253) : null;
  } catch {
    return null;
  }
}

function safePath(value: string) {
  const path = journeySourcePath(value);
  return path && isJourneySourcePath(path) ? path : null;
}

function safeSource(value: Prisma.JsonValue | null) {
  const source = jsonRecord(value);
  const result: AdminSupportDetail["source"] = {};
  for (const key of ["page", "platform", "source", "action"] as const) {
    const value = text(source[key], 80);
    if (value) result[key] = value;
  }
  return result;
}

function dateRange(from: string | null, to: string | null) {
  return from || to ? { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } : undefined;
}

function identityWhere(scope: { identity: "all" | "guest" | "registered" | "unattributed"; userId: string | null; visitorId: string | null }) {
  const eligibleVisitor = { consentStatus: "GRANTED" as const, trackingDisabledAt: null };
  // Registered-customer drilldowns must match the activity timeline: include
  // direct records and pre-signup records only from consented, exclusively
  // linked visitors. Leave general identity filters and explicit visitor
  // filters unchanged.
  if (scope.identity === "registered" && scope.userId && !scope.visitorId) {
    return {
      OR: [
        { userId: scope.userId },
        { userId: null, visitor: { is: eligibleLinkedVisitorWhere(scope.userId) } },
      ],
    };
  }
  return {
    ...(scope.identity === "registered" ? { userId: { not: null } } : {}),
    ...(scope.identity === "guest" ? { userId: null, visitor: { is: eligibleVisitor } } : {}),
    ...(scope.identity === "unattributed" ? {
      userId: null,
      OR: [
        { visitorId: null },
        { visitor: { is: { NOT: eligibleVisitor } } },
      ],
    } : {}),
    ...(scope.userId ? { userId: scope.userId } : {}),
    ...(scope.visitorId ? { visitorId: scope.visitorId, visitor: { is: eligibleVisitor } } : {}),
  };
}

function cursorWhere(cursor: { at: string; id: string } | null) {
  if (!cursor) return {};
  const at = new Date(cursor.at);
  return { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: cursor.id } }] };
}

function fallbackSearchDiagnostic(row: SearchRow): AdminSearchDiagnostic {
  if (row.status === "SUCCESS" && row.resultCount === 0) {
    return {
      outcome: "ZERO_RESULTS",
      reasonCode: "NO_MATCHING_RESULTS",
      reason: "The search completed without a recorded provider failure but returned no matching results.",
      retryable: false,
      correlation: "legacy_fallback",
      providers: [],
    };
  }
  if (row.status === "SUCCESS") {
    return {
      outcome: "SUCCESS",
      reasonCode: "SEARCH_SUCCEEDED",
      reason: "Search completed successfully.",
      retryable: false,
      correlation: "legacy_fallback",
      providers: [],
    };
  }
  if (row.status === "PARTIAL") {
    return {
      outcome: "PARTIAL",
      reasonCode: "PARTIAL_REASON_UNAVAILABLE",
      reason: "Some providers did not complete successfully, but an exact provider reason was not recorded for this search.",
      retryable: null,
      correlation: "legacy_fallback",
      providers: [],
    };
  }
  return {
    outcome: "FAILED",
    reasonCode: "FAILURE_REASON_UNAVAILABLE",
    reason: "The search failed, but an exact provider reason was not recorded for this search.",
    retryable: null,
    correlation: "legacy_fallback",
    providers: [],
  };
}

function providerDiagnostic(row: {
  provider: string;
  status: string;
  latencyMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}): AdminSearchProviderDiagnostic {
  if (row.status === "SUCCESS") {
    return {
      provider: text(row.provider, 100) ?? "Unknown provider",
      status: "SUCCESS",
      reasonCode: null,
      reason: "Provider completed successfully.",
      retryable: false,
      latencyMs: row.latencyMs,
      observedAt: row.createdAt.toISOString(),
    };
  }
  if (row.status === "DISABLED") {
    const issue = row.errorMessage ? classifyProviderIssue(row.errorMessage) : null;
    return {
      provider: text(row.provider, 100) ?? "Unknown provider",
      status: "DISABLED",
      reasonCode: issue?.code ?? "PROVIDER_DISABLED",
      reason: issue?.label ?? "Provider was unavailable or disabled for this search.",
      retryable: issue?.retryable ?? false,
      latencyMs: row.latencyMs,
      observedAt: row.createdAt.toISOString(),
    };
  }
  const issue = classifyProviderIssue(row.errorMessage);
  return {
    provider: text(row.provider, 100) ?? "Unknown provider",
    status: row.status === "DEGRADED" ? "DEGRADED" : "FAILED",
    reasonCode: issue.code,
    reason: issue.label,
    retryable: issue.retryable,
    latencyMs: row.latencyMs,
    observedAt: row.createdAt.toISOString(),
  };
}

function exactSearchDiagnostic(row: SearchRow, providers: AdminSearchProviderDiagnostic[]): AdminSearchDiagnostic {
  if (!providers.length) return fallbackSearchDiagnostic(row);
  if (row.status === "SUCCESS" && row.resultCount === 0) {
    return {
      outcome: "ZERO_RESULTS",
      reasonCode: "NO_MATCHING_RESULTS",
      reason: "The search completed without a recorded provider failure but returned no matching results.",
      retryable: false,
      correlation: "exact",
      providers,
    };
  }
  if (row.status === "SUCCESS") {
    return {
      outcome: "SUCCESS",
      reasonCode: "SEARCH_SUCCEEDED",
      reason: "Search completed successfully.",
      retryable: false,
      correlation: "exact",
      providers,
    };
  }
  const issues = providers.filter((provider) => provider.status === "FAILED" || provider.status === "DEGRADED" || provider.status === "DISABLED");
  if (row.status === "PARTIAL") {
    const returnedResults = row.resultCount > 0;
    const successfulProviders = providers.filter((provider) => provider.status === "SUCCESS");
    return {
      outcome: "PARTIAL",
      reasonCode: "PROVIDER_PARTIAL_FAILURE",
      reason: returnedResults
        ? successfulProviders.length
          ? (issues.length === 1
            ? issues[0].provider + " did not complete successfully while another provider returned results."
            : "One or more providers did not complete successfully while another provider returned results.")
          : (issues.length === 1
            ? issues[0].provider + " did not complete successfully, but partial results were returned."
            : "One or more providers did not complete successfully, but partial results were returned.")
        : (issues.length === 1
          ? issues[0].provider + " did not complete successfully, and the search returned no matching results."
          : "One or more providers did not complete successfully, and the search returned no matching results."),
      retryable: issues.some((issue) => issue.retryable === true) ? true : issues.every((issue) => issue.retryable === false) ? false : null,
      correlation: "exact",
      providers,
    };
  }
  const successfulProviders = providers.filter((provider) => provider.status === "SUCCESS");
  if (issues.length === 1 && !successfulProviders.length) {
    return {
      outcome: "FAILED",
      reasonCode: issues[0].reasonCode ?? "PROVIDER_ERROR",
      reason: issues[0].reason,
      retryable: issues[0].retryable,
      correlation: "exact",
      providers,
    };
  }
  if (!issues.length) {
    return {
      outcome: "FAILED",
      reasonCode: "SEARCH_PROCESSING_FAILURE",
      reason: "Providers responded, but the search could not complete during internal result processing.",
      retryable: true,
      correlation: "exact",
      providers,
    };
  }
  if (successfulProviders.length) {
    return {
      outcome: "FAILED",
      reasonCode: "PROVIDER_FAILURE_NO_USABLE_RESULTS",
      reason: "At least one provider responded successfully, but provider failures or unavailable coverage left the search without usable results.",
      retryable: issues.some((issue) => issue.retryable === true) ? true : issues.every((issue) => issue.retryable === false) ? false : null,
      correlation: "exact",
      providers,
    };
  }
  return {
    outcome: "FAILED",
    reasonCode: "ALL_PROVIDERS_UNAVAILABLE",
    reason: "No available provider completed the search successfully.",
    retryable: issues.some((issue) => issue.retryable === true) ? true : issues.every((issue) => issue.retryable === false) ? false : null,
    correlation: "exact",
    providers,
  };
}

type ProviderExecution = { provider: string; status: "SUCCESS" | "DEGRADED" | "FAILED" | "DISABLED" };
type ProviderExecutionLog = ProviderExecution & { service: string; metadata: Prisma.JsonValue | null; createdAt: Date };
function exactProviderSummary(logs: readonly ProviderExecution[]): NonNullable<AdminSearchRead["providerTelemetry"]> | null {
  const latest = new Map<string, ProviderExecution["status"]>();
  for (const log of logs) {
    const name = text(log.provider, 100);
    if (name) latest.set(name.toLowerCase(), log.status);
  }
  if (!latest.size) return null;
  const statuses = [...latest.values()];
  return {
    total: statuses.length,
    successful: statuses.filter(status => status === "SUCCESS").length,
    failed: statuses.filter(status => status === "FAILED").length,
    degraded: statuses.filter(status => status === "DEGRADED").length,
    disabled: statuses.filter(status => status === "DISABLED").length,
  };
}
function correlatedProviderLogs(rows: readonly SearchRow[], logs: readonly ProviderExecutionLog[], environment: PublicEnvironment) {
  const requests = new Map<string, { product: SearchRow["type"]; createdAt: Date }>();
  for (const row of rows) if (row.requestId) requests.set(row.requestId, { product: row.type, createdAt: row.createdAt });
  const correlated = new Map<string, ProviderExecutionLog[]>();
  for (const log of logs) {
    const meta = jsonRecord(log.metadata);
    const requestId = typeof meta.requestId === "string"
      ? meta.requestId
      : meta.progressive === true && typeof meta.trackId === "string" ? meta.trackId : null;
    if (!requestId || meta.environment !== environment) continue;
    const row = requests.get(requestId);
    if (!row || log.service !== providerSearchService(row.product)) continue;
    if (meta.requestId === undefined && (row.product !== "HOTEL" || meta.progressive !== true)) continue;
    const entries = correlated.get(requestId) ?? [];
    entries.push(log);
    correlated.set(requestId, entries);
  }
  return correlated;
}

// Only exact, environment-scoped execution records count; progressive Android
// hotels store the same search request ID under metadata.trackId.
function providerLogWhere(requestIds: readonly string[], services: readonly string[], environment: PublicEnvironment): Prisma.ApiProviderLogWhereInput {
  return {
    service: { in: [...services] },
    metadata: { path: ["environment"], equals: environment },
    OR: [
      ...requestIds.map(id => ({ metadata: { path: ["requestId"], equals: id } })),
      ...(services.includes("hotel-search")
        ? requestIds.map(id => ({
          AND: [
            { service: "hotel-search" },
            { metadata: { path: ["trackId"], equals: id } },
            { metadata: { path: ["progressive"], equals: true } },
            { metadata: { path: ["requestId"], equals: Prisma.DbNull } },
          ],
        }))
        : []),
    ],
  };
}

// Prisma cannot correlate SearchHistory and ApiProviderLog across the JSON
// request keys in its model where API. For provider-filtered lists and KPI
// totals, use the same parameterized EXISTS predicate before keyset paging.
// Identity, consent, date and environment scope must match searchWhere().
function exactProviderFilteredSearchSql(scope: AdminSearchScope, cursor: { at: string; id: string } | null = null): Prisma.Sql {
  if (!scope.provider) throw new Error("An exact provider is required");
  const clauses: Prisma.Sql[] = [
    Prisma.sql`s."query"->>'environment' = ${scope.environment}`,
    Prisma.sql`s."requestId" IS NOT NULL`,
    Prisma.sql`EXISTS (
      SELECT 1 FROM "ApiProviderLog" p
      WHERE p."service" = CASE s."type"::text
        WHEN 'FLIGHT' THEN 'flight-search'
        WHEN 'HOTEL' THEN 'hotel-search'
        WHEN 'CAR' THEN 'car-search'
        WHEN 'PACKAGE' THEN 'package-search'
      END
        AND p."metadata"->>'environment' = ${scope.environment}
        AND lower(p."provider") = lower(${scope.provider})
        AND (
          p."metadata"->>'requestId' = s."requestId"
          OR (
            s."type"::text = 'HOTEL'
            AND p."metadata"->>'requestId' IS NULL
            AND p."metadata"->>'progressive' = 'true'
            AND p."metadata"->>'trackId' = s."requestId"
          )
        )
    )`,
  ];
  if (scope.product) clauses.push(Prisma.sql`s."type"::text = ${scope.product}`);
  if (scope.status) clauses.push(Prisma.sql`s."status"::text = ${scope.status}`);
  if (scope.from) clauses.push(Prisma.sql`s."createdAt" >= ${new Date(scope.from)}`);
  if (scope.to) clauses.push(Prisma.sql`s."createdAt" < ${new Date(scope.to)}`);

  const eligible = Prisma.sql`EXISTS (
    SELECT 1 FROM "Visitor" v
    WHERE v."id" = s."visitorId"
      AND v."consentStatus"::text = 'GRANTED'
      AND v."trackingDisabledAt" IS NULL
  )`;
  if (scope.identity === "registered" && scope.userId && !scope.visitorId) {
    const userId = scope.userId;
    clauses.push(Prisma.sql`(
      s."userId" = ${userId}
      OR (
        s."userId" IS NULL
        AND EXISTS (
          SELECT 1 FROM "Visitor" v
          WHERE v."id" = s."visitorId"
            AND v."currentUserId" = ${userId}
            AND v."consentStatus"::text = 'GRANTED'
            AND v."trackingDisabledAt" IS NULL
            AND EXISTS (
              SELECT 1 FROM "VisitorIdentityLink" link
              WHERE link."visitorId" = v."id" AND link."userId" = ${userId}
            )
            AND NOT EXISTS (
              SELECT 1 FROM "VisitorIdentityLink" link
              WHERE link."visitorId" = v."id" AND link."userId" <> ${userId}
            )
        )
      )
    )`);
  } else {
    if (scope.identity === "registered") clauses.push(Prisma.sql`s."userId" IS NOT NULL`);
    if (scope.identity === "guest") {
      clauses.push(Prisma.sql`s."userId" IS NULL`);
      clauses.push(eligible);
    }
    if (scope.identity === "unattributed") {
      clauses.push(Prisma.sql`s."userId" IS NULL`);
      clauses.push(Prisma.sql`(
        s."visitorId" IS NULL
        OR EXISTS (
          SELECT 1 FROM "Visitor" v
          WHERE v."id" = s."visitorId"
            AND (v."consentStatus"::text <> 'GRANTED' OR v."trackingDisabledAt" IS NOT NULL)
        )
      )`);
    }
    if (scope.userId) clauses.push(Prisma.sql`s."userId" = ${scope.userId}`);
    if (scope.visitorId) {
      clauses.push(Prisma.sql`s."visitorId" = ${scope.visitorId}`);
      clauses.push(eligible);
    }
  }

  if (cursor) {
    const at = new Date(cursor.at);
    clauses.push(Prisma.sql`(
      s."createdAt" < ${at}
      OR (s."createdAt" = ${at} AND s."id" < ${cursor.id})
    )`);
  }
  return Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
}

function searchDto(row: SearchRow, environment: PublicEnvironment, exactLogs: readonly ProviderExecution[] = []): AdminSearchRead {
  const query = jsonRecord(row.query);
  const visitorId = attributableVisitorId(row.visitorId, row.visitor);
  const providers = [...new Set(exactLogs.map(log => text(log.provider, 100)).filter((value): value is string => Boolean(value)))].slice(0, 10);
  return {
    id: row.id,
    requestId: text(row.requestId, 128),
    identity: identity(row.userId, visitorId),
    product: row.type,
    origin: text(row.origin, 160),
    destination: text(row.destination, 160),
    checkIn: row.checkIn?.toISOString() ?? null,
    checkOut: row.checkOut?.toISOString() ?? null,
    resultCount: row.resultCount,
    latencyMs: row.latencyMs,
    status: row.status,
    providers,
    providerTelemetry: exactProviderSummary(exactLogs),
    market: text(query.market ?? query.country ?? query.region, 80),
    currency: text(query.currency, 12),
    environment,
    createdAt: row.createdAt.toISOString(),
  };
}

function handoffDto(row: HandoffRow, environment: PublicEnvironment): AdminHandoffRead {
  const searchHistoryId = row.journeyEvents[0]?.searchHistoryId ?? null;
  const visitorId = attributableVisitorId(row.visitorId, row.visitor);
  return {
    id: row.id,
    identity: identity(row.userId, visitorId),
    product: row.type,
    provider: text(row.provider, 100) ?? "Unknown provider",
    route: text(row.route, 200),
    price: row.price ? row.price.toString() : null,
    currency: text(row.currency, 12) ?? "USD",
    sourcePage: safePath(row.sourcePage),
    destinationDomain: safeDomain(row.destinationUrl),
    environment,
    searchCorrelation: { kind: searchHistoryId ? "exact" : "unavailable", searchHistoryId },
    createdAt: row.createdAt.toISOString(),
  };
}

function supportListDto(row: SupportListRow): AdminSupportListItem {
  return {
    id: row.id,
    identity: { kind: row.userId ? "registered" : "guest", userId: row.userId },
    email: text(row.email, 320) ?? "",
    subject: text(row.subject, 160) ?? "",
    category: text(row.category, 80) ?? "",
    status: row.status,
    priority: row.priority,
    messageCount: row._count.messages,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function deletionDto(row: DeletionRow): AdminDeletionListItem {
  return {
    id: row.id,
    userId: row.userId,
    email: text(row.email, 320) ?? "",
    user: {
      email: text(row.user.email, 320),
      name: text(row.user.name, 160),
      role: row.user.role,
      status: row.user.status,
    },
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    deletionScheduledAt: row.deletionScheduledAt.toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    supportTicketId: row.supportTicketId,
    adminReference: text(row.adminNotificationId, 255),
    hasReviewNotes: Boolean(row.reviewNotes?.trim()),
  };
}

function searchWhere(scope: AdminSearchScope, cursor?: { at: string; id: string } | null): Prisma.SearchHistoryWhereInput {
  return {
    ...identityWhere(scope),
    ...(scope.product ? { type: scope.product } : {}),
    ...(scope.status ? { status: scope.status } : {}),
    ...(dateRange(scope.from, scope.to) ? { createdAt: dateRange(scope.from, scope.to) } : {}),
    query: { path: ["environment"], equals: scope.environment },
    AND: [
      ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { lt: cursor.id } }] }] : []),
    ],
  };
}

function nextCursor<T extends { id: string; createdAt: Date }>(kind: "searches" | "handoffs" | "support", scope: object, records: T[], limit: number) {
  const page = records.slice(0, limit);
  const last = page.at(-1);
  return { page, next: records.length > limit && last ? encodeAdminOperationalCursor(kind, scope, { at: last.createdAt.toISOString(), id: last.id }) : null };
}

function deletionNextCursor(scope: object, records: DeletionRow[], limit: number) {
  const page = records.slice(0, limit);
  const last = page.at(-1);
  return { page, next: records.length > limit && last ? encodeAdminOperationalCursor("deletions", scope, { at: last.requestedAt.toISOString(), id: last.id }) : null };
}

export function createAdminOperationalReadService(dependencies: Dependencies) {
  async function authorized<T>(work: (db: AdminOperationalDatabase) => Promise<AdminOperationalResult<T>>): Promise<AdminOperationalResult<T>> {
    try {
      if (!(await dependencies.authorize())) return { status: "forbidden" };
      const db = dependencies.database();
      if (!db) return { status: "unavailable" };
      return await work(db);
    } catch {
      return { status: "unavailable" };
    }
  }

  return {
    searches: {
      list(params: URLSearchParams): Promise<AdminOperationalResult<AdminOperationalList<AdminSearchRead, AdminSearchScope>>> {
        return authorized(async db => {
          const parsed = parseAdminSearchQuery(params, dependencies.environment());
          if (parsed.status !== "ok") return parsed;
          const { scope, cursor, limit } = parsed.data;
          const providerIds = scope.provider
            ? (await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
                SELECT s."id" FROM "SearchHistory" s
                ${exactProviderFilteredSearchSql(scope, cursor)}
                ORDER BY s."createdAt" DESC, s."id" DESC
                LIMIT ${limit + 1}
              `)).map(row => row.id)
            : null;
          const records = providerIds !== null && !providerIds.length
            ? []
            : await db.searchHistory.findMany({
              where: {
                ...searchWhere(scope, cursor),
                ...(providerIds !== null ? { id: { in: providerIds } } : {}),
              },
              select: searchSelect,
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: limit + 1,
            });
          const page = nextCursor("searches", scope, records, limit);
          const requestIds = page.page.map(row => row.requestId).filter((id): id is string => Boolean(id));
          const services = [...new Set(page.page.map(row => providerSearchService(row.type)))];
          const logs = requestIds.length
            ? await db.apiProviderLog.findMany({
              where: providerLogWhere(requestIds, services, scope.environment),
              select: { provider: true, status: true, service: true, metadata: true, createdAt: true },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: 2001,
            })
            : [];
          // Never present a partial query result as an exact provider count.
          // Keep the record visible but mark telemetry unavailable if the cap is hit.
          const byRequest = logs.length <= 2000
            ? correlatedProviderLogs(page.page, logs, scope.environment)
            : new Map<string, ProviderExecutionLog[]>();
          return { status: "ok", data: { scope, items: page.page.map(row => searchDto(row, scope.environment, row.requestId ? byRequest.get(row.requestId) ?? [] : [])), nextCursor: page.next } };
        });
      },
      summary(params: URLSearchParams): Promise<AdminOperationalResult<AdminSearchSummary>> {
        return authorized(async db => {
          const sanitized = new URLSearchParams(params);
          sanitized.delete("cursor");
          sanitized.delete("limit");
          sanitized.set("limit", "1");
          const parsed = parseAdminSearchQuery(sanitized, dependencies.environment());
          if (parsed.status !== "ok") return parsed;
          const { scope } = parsed.data;
          const counts = { total: 0, success: 0, partial: 0, failed: 0 };
          if (scope.provider) {
            const groups = await db.$queryRaw<Array<{ status: string; count: bigint }>>(Prisma.sql`
              SELECT s."status"::text AS "status", COUNT(*) AS "count"
              FROM "SearchHistory" s
              ${exactProviderFilteredSearchSql(scope)}
              GROUP BY s."status"
            `);
            for (const group of groups) {
              const count = Number(group.count);
              counts.total += count;
              if (group.status === "SUCCESS") counts.success += count;
              else if (group.status === "PARTIAL") counts.partial += count;
              else if (group.status === "FAILED") counts.failed += count;
            }
          } else {
            const groups = await db.searchHistory.groupBy({
              by: ["status"],
              where: searchWhere(scope),
              _count: { _all: true },
            });
            for (const group of groups) {
              const count = group._count._all;
              counts.total += count;
              if (group.status === "SUCCESS") counts.success += count;
              else if (group.status === "PARTIAL") counts.partial += count;
              else if (group.status === "FAILED") counts.failed += count;
            }
          }
          return { status: "ok", data: { scope, ...counts } };
        });
      },
      detail(id: string, params: URLSearchParams): Promise<AdminOperationalResult<AdminSearchDetail>> {
        return authorized<AdminSearchDetail>(async db => {
          const parsedId = parseAdminOperationalId(id);
          if (parsedId.status !== "ok") return parsedId;
          const env = parseAdminOperationalEnvironment(params, dependencies.environment());
          if (env.status !== "ok") return env;
          const row = await db.searchHistory.findFirst({ where: { id: parsedId.data, query: { path: ["environment"], equals: env.data } }, select: searchSelect });
          if (!row) return { status: "not_found" };
          let providers: AdminSearchProviderDiagnostic[] = [];
          if (row.requestId) {
            const logs = await db.apiProviderLog.findMany({
              where: {
                service: providerSearchService(row.type),
                ...providerLogWhere([row.requestId], [providerSearchService(row.type)], env.data),
              },
              select: {
                provider: true,
                status: true,
                latencyMs: true,
                errorMessage: true,
                createdAt: true,
              },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: 20,
            });
            providers = logs.map(providerDiagnostic);
          }
          return {
            status: "ok",
            data: {
              ...searchDto(row, env.data, providers),
              diagnostic: exactSearchDiagnostic(row, providers),
            },
          };
        });
      },
    },
    handoffs: {
      list(params: URLSearchParams): Promise<AdminOperationalResult<AdminOperationalList<AdminHandoffRead, AdminHandoffScope>>> {
        return authorized(async db => {
          const parsed = parseAdminHandoffQuery(params, dependencies.environment());
          if (parsed.status !== "ok") return parsed;
          const { scope, cursor, limit } = parsed.data;
          const where: Prisma.RedirectLogWhereInput = {
            ...identityWhere(scope),
            ...(scope.product ? { type: scope.product } : {}),
            ...(scope.provider ? { provider: { equals: scope.provider, mode: "insensitive" } } : {}),
            ...(dateRange(scope.from, scope.to) ? { createdAt: dateRange(scope.from, scope.to) } : {}),
            metadata: { path: ["environment"], equals: scope.environment },
            ...(scope.correlation === "exact" ? { journeyEvents: { some: { searchHistoryId: { not: null } } } } : {}),
            ...(scope.correlation === "unavailable" ? { journeyEvents: { none: { searchHistoryId: { not: null } } } } : {}),
            AND: cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { lt: cursor.id } }] }] : [],
          };
          const records = await db.redirectLog.findMany({ where, select: handoffSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
          const page = nextCursor("handoffs", scope, records, limit);
          return { status: "ok", data: { scope, items: page.page.map(row => handoffDto(row, scope.environment)), nextCursor: page.next } };
        });
      },
      detail(id: string, params: URLSearchParams): Promise<AdminOperationalResult<AdminHandoffRead>> {
        return authorized<AdminHandoffRead>(async db => {
          const parsedId = parseAdminOperationalId(id);
          if (parsedId.status !== "ok") return parsedId;
          const env = parseAdminOperationalEnvironment(params, dependencies.environment());
          if (env.status !== "ok") return env;
          const row = await db.redirectLog.findFirst({ where: { id: parsedId.data, metadata: { path: ["environment"], equals: env.data } }, select: handoffSelect });
          return row ? { status: "ok", data: handoffDto(row, env.data) } : { status: "not_found" };
        });
      },
    },
    support: {
      list(params: URLSearchParams): Promise<AdminOperationalResult<AdminOperationalList<AdminSupportListItem, AdminSupportScope>>> {
        return authorized(async db => {
          const parsed = parseAdminSupportQuery(params);
          if (parsed.status !== "ok") return parsed;
          const { scope, cursor, limit } = parsed.data;
          const where: Prisma.SupportTicketWhereInput = {
            ...(scope.status ? { status: scope.status } : {}),
            ...(scope.priority ? { priority: scope.priority } : {}),
            ...(scope.category ? { category: { equals: scope.category, mode: "insensitive" } } : {}),
            ...(dateRange(scope.from, scope.to) ? { createdAt: dateRange(scope.from, scope.to) } : {}),
            AND: [
              ...(scope.q ? [{ OR: [
                { email: { contains: scope.q, mode: "insensitive" as const } },
                { subject: { contains: scope.q, mode: "insensitive" as const } },
                { user: { is: { email: { contains: scope.q, mode: "insensitive" as const } } } },
                { user: { is: { name: { contains: scope.q, mode: "insensitive" as const } } } },
              ] }] : []),
              ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { lt: cursor.id } }] }] : []),
            ],
          };
          const records = await db.supportTicket.findMany({ where, select: supportListSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
          const page = nextCursor("support", scope, records, limit);
          return { status: "ok", data: { scope, items: page.page.map(supportListDto), nextCursor: page.next } };
        });
      },
      detail(id: string): Promise<AdminOperationalResult<AdminSupportDetail>> {
        return authorized<AdminSupportDetail>(async db => {
          const parsedId = parseAdminOperationalId(id);
          if (parsedId.status !== "ok") return parsedId;
          const row = await db.supportTicket.findUnique({ where: { id: parsedId.data }, select: supportDetailSelect });
          if (!row) return { status: "not_found" };
          const deletion = row.category === "account_deletion"
            ? await db.accountDeletionRequest.findFirst({ where: { supportTicketId: row.id }, select: { id: true } })
            : null;
          return {
            status: "ok",
            data: {
              ...supportListDto(row),
              user: row.user ? { id: row.user.id, email: text(row.user.email, 320), name: text(row.user.name, 160) } : null,
              source: safeSource(row.sourceContext),
              messages: row.messages.map(message => ({ id: message.id, author: text(message.author, 40) ?? "unknown", body: message.body, createdAt: message.createdAt.toISOString() })),
              deletionRequestId: deletion?.id ?? null,
            },
          };
        });
      },
    },
    deletions: {
      list(params: URLSearchParams): Promise<AdminOperationalResult<AdminOperationalList<AdminDeletionListItem, AdminDeletionScope>>> {
        return authorized(async db => {
          const parsed = parseAdminDeletionQuery(params);
          if (parsed.status !== "ok") return parsed;
          const { scope, cursor, limit } = parsed.data;
          const requestedAt = dateRange(scope.from, scope.to);
          const where: Prisma.AccountDeletionRequestWhereInput = {
            ...(scope.status ? { status: scope.status } : {}),
            ...(requestedAt ? { requestedAt } : {}),
            AND: [
              ...(scope.q ? [{ OR: [
                { email: { contains: scope.q, mode: "insensitive" as const } },
                { user: { is: { email: { contains: scope.q, mode: "insensitive" as const } } } },
                { user: { is: { name: { contains: scope.q, mode: "insensitive" as const } } } },
              ] }] : []),
              ...(cursor ? [{ OR: [{ requestedAt: { lt: new Date(cursor.at) } }, { requestedAt: new Date(cursor.at), id: { lt: cursor.id } }] }] : []),
            ],
          };
          const records = await db.accountDeletionRequest.findMany({ where, select: deletionSelect, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], take: limit + 1 });
          const page = deletionNextCursor(scope, records, limit);
          return { status: "ok", data: { scope, items: page.page.map(deletionDto), nextCursor: page.next } };
        });
      },
    },
  };
}

export type AdminOperationalReadService = ReturnType<typeof createAdminOperationalReadService>;

export const __adminOperationalReadCoreTest = {
  safeDomain,
  safePath,
  safeSource,
  identity,
  attributableVisitorId,
  identityWhere,
  fallbackSearchDiagnostic,
  providerDiagnostic,
  exactSearchDiagnostic,
  exactProviderSummary,
  correlatedProviderLogs,
  exactProviderFilteredSearchSql,
  providerLogWhere,
};
