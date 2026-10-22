import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { isJourneySourcePath, journeySourcePath } from "@/lib/search-journey";
import type { PublicEnvironment } from "@/lib/stagingSafety";
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
  type AdminSearchQuery,
  type AdminSearchRead,
  type AdminSearchScope,
  type AdminSupportDetail,
  type AdminSupportListItem,
  type AdminSupportQuery,
  type AdminSupportScope,
} from "./adminOperationalReadContract";

export type AdminOperationalDatabase = Pick<PrismaClient, "searchHistory" | "redirectLog" | "supportTicket" | "accountDeletionRequest">;
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

function searchDto(row: SearchRow, environment: PublicEnvironment): AdminSearchRead {
  const query = jsonRecord(row.query);
  const visitorId = attributableVisitorId(row.visitorId, row.visitor);
  const providers = [...new Set([
    text(query.provider, 100),
    ...row.journeyEvents.map(event => text(event.provider, 100)),
  ].filter((value): value is string => Boolean(value)))].slice(0, 10);
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
          const where: Prisma.SearchHistoryWhereInput = {
            ...identityWhere(scope),
            ...(scope.product ? { type: scope.product } : {}),
            ...(scope.status ? { status: scope.status } : {}),
            ...(dateRange(scope.from, scope.to) ? { createdAt: dateRange(scope.from, scope.to) } : {}),
            query: { path: ["environment"], equals: scope.environment },
            AND: [
              ...(scope.provider ? [{
                OR: [
                  { query: { path: ["provider"], equals: scope.provider } },
                  { journeyEvents: { some: { provider: { equals: scope.provider, mode: "insensitive" as const } } } },
                ],
              }] : []),
              ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { lt: cursor.id } }] }] : []),
            ],
          };
          const records = await db.searchHistory.findMany({ where, select: searchSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1 });
          const page = nextCursor("searches", scope, records, limit);
          return { status: "ok", data: { scope, items: page.page.map(row => searchDto(row, scope.environment)), nextCursor: page.next } };
        });
      },
      detail(id: string, params: URLSearchParams): Promise<AdminOperationalResult<AdminSearchRead>> {
        return authorized<AdminSearchRead>(async db => {
          const parsedId = parseAdminOperationalId(id);
          if (parsedId.status !== "ok") return parsedId;
          const env = parseAdminOperationalEnvironment(params, dependencies.environment());
          if (env.status !== "ok") return env;
          const row = await db.searchHistory.findFirst({ where: { id: parsedId.data, query: { path: ["environment"], equals: env.data } }, select: searchSelect });
          return row ? { status: "ok", data: searchDto(row, env.data) } : { status: "not_found" };
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

export const __adminOperationalReadCoreTest = { safeDomain, safePath, safeSource, identity, attributableVisitorId };
