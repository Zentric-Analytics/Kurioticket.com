import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  encodeAdminAuditCursor,
  parseAdminAuditQuery,
  type AdminAuditList,
  type AdminAuditRead,
  type AdminAuditResult,
} from "./adminAuditReadContract";

type Database = Pick<PrismaClient, "adminAuditLog">;
type Dependencies = {
  authorize: () => Promise<boolean>;
  database: () => Database | null;
  now?: () => Date;
};

const select = {
  id: true,
  adminUserId: true,
  adminEmail: true,
  action: true,
  targetType: true,
  targetId: true,
  targetEmail: true,
  createdAt: true,
} satisfies Prisma.AdminAuditLogSelect;

function safe(value: string | null, max: number) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null;
}

function dto(row: Prisma.AdminAuditLogGetPayload<{ select: typeof select }>): AdminAuditRead {
  return {
    id: row.id,
    adminUserId: row.adminUserId,
    adminEmail: safe(row.adminEmail, 320) ?? "unknown-admin",
    action: safe(row.action, 120) ?? "unknown",
    targetType: safe(row.targetType, 120) ?? "unknown",
    targetId: safe(row.targetId, 160),
    targetEmail: safe(row.targetEmail, 320),
    createdAt: row.createdAt.toISOString(),
  };
}

export function createAdminAuditReadService(dependencies: Dependencies) {
  return {
    async list(params: URLSearchParams): Promise<AdminAuditResult<AdminAuditList>> {
      try {
        if (!(await dependencies.authorize())) return { status: "forbidden" };
        const parsed = parseAdminAuditQuery(params, (dependencies.now ?? (() => new Date()))());
        if (parsed.status !== "ok") return parsed;
        const db = dependencies.database();
        if (!db) return { status: "unavailable" };

        const { scope, limit, cursor } = parsed.data;
        const where: Prisma.AdminAuditLogWhereInput = {
          createdAt: { gte: new Date(scope.from), lt: new Date(scope.to) },
          ...(scope.action ? { action: { contains: scope.action, mode: "insensitive" } } : {}),
          ...(scope.adminEmail ? { adminEmail: { contains: scope.adminEmail, mode: "insensitive" } } : {}),
          ...(scope.targetType ? { targetType: { equals: scope.targetType, mode: "insensitive" } } : {}),
          ...(scope.targetEmail ? { targetEmail: { contains: scope.targetEmail, mode: "insensitive" } } : {}),
          ...(cursor ? {
            OR: [
              { createdAt: { lt: new Date(cursor.at) } },
              { createdAt: new Date(cursor.at), id: { lt: cursor.id } },
            ],
          } : {}),
        };
        const rows = await db.adminAuditLog.findMany({
          where,
          select,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
        });
        const page = rows.slice(0, limit);
        const last = page.at(-1);
        return {
          status: "ok",
          data: {
            scope,
            items: page.map(dto),
            nextCursor: rows.length > limit && last
              ? encodeAdminAuditCursor(scope, last.createdAt.toISOString(), last.id)
              : null,
          },
        };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
