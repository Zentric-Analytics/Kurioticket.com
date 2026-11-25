import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { ADMIN_DEFAULT_TIME_ZONE, resolveAdminTimeZone, viewerTodayStart } from "@/lib/adminLocalTime";
import { adminCustomDateRange } from "@/lib/adminReportingRanges";

export type SettingsHistoryRange = "today" | "24h" | "7d" | "30d" | "90d" | "all" | "custom";
export type SettingsHistoryCategory = "all" | "product" | "automation" | "team" | "legacy";
export type SettingsHistoryDetail = { label: string; value: string };
export type SettingsHistoryEntry = {
  id: string;
  section: string;
  change: string;
  adminEmail: string;
  createdAt: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetEmail: string | null;
  details: SettingsHistoryDetail[];
};
export type SettingsHistoryResult =
  | { status: "ok"; items: SettingsHistoryEntry[]; nextCursor: string | null; resetCursor?: true }
  | { status: "forbidden" | "unavailable" | "invalid" };

type SettingsQuery = {
  range: SettingsHistoryRange;
  category: SettingsHistoryCategory;
  cursor?: string;
  limit?: 6 | 25;
  fromDate?: string;
  toDate?: string;
  timeZone?: string;
};
type Database = Pick<PrismaClient, "adminAuditLog">;
type Dependencies = { authorize: () => Promise<boolean>; database: () => Database | null; now?: () => Date };
type Position = { at: string; id: string };
type Scope = { range: SettingsHistoryRange; category: SettingsHistoryCategory; from: string; to: string; timeZone?: string };
const windows: Record<Exclude<SettingsHistoryRange, "all" | "custom" | "today">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};
const categories: readonly SettingsHistoryCategory[] = ["all", "product", "automation", "team", "legacy"];
const teamActions = ["TEAM_ACCESS_MEMBER_APPROVED", "TEAM_ACCESS_UPDATE", "TEAM_ACCESS_REACTIVATE", "TEAM_ACCESS_SUSPEND", "TEAM_ACCESS_REVOKE"] as const;
const select = {
  id: true, action: true, targetType: true, targetId: true, targetEmail: true,
  adminEmail: true, createdAt: true, metadata: true,
} satisfies Prisma.AdminAuditLogSelect;
type AuditRow = Prisma.AdminAuditLogGetPayload<{ select: typeof select }>;

function safe(value: unknown, max = 160): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || null;
}
function metadataOf(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function bool(value: unknown): string | null {
  return typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : null;
}
function allowedRoles(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const roles = value.filter((role): role is string => role === "TESTER" || role === "DEVELOPER");
  return roles.length ? [...new Set(roles)].map(role => role === "TESTER" ? "Tester" : "Developer").join(", ") : null;
}
function describe(row: AuditRow): SettingsHistoryEntry {
  const m = metadataOf(row.metadata);
  const details: SettingsHistoryDetail[] = [];
  const add = (label: string, value: string | null) => { if (value !== null) details.push({ label, value }); };
  let section = "Settings";
  let change = "Setting updated";

  if (row.action === "FEATURE_CONTROL_UPDATED") {
    section = m.category === "Travel Search" ? "Product availability"
      : m.category === "Travel Automation" ? "Travel automation" : "Feature controls";
    change = "Feature availability updated";
    add("Feature", safe(m.featureKey, 80));
    add("Environment", m.environment === "STAGING" || m.environment === "PRODUCTION" ? m.environment : null);
    add("Previous state", bool(m.previousEnabled));
    add("New state", bool(m.nextEnabled));
    add("Reason", safe(m.reason, 500));
  } else if (row.action === "ADMIN_NOTIFICATION_PREFERENCE_UPDATED") {
    section = "Notification preferences (retired)";
    change = "Legacy preference updated";
    add("Setting", m.key === "showAcknowledgedWarnings" ? "Show acknowledged warnings" : null);
    add("Previous state", bool(m.previous));
    add("New state", bool(m.next));
    add("Reason", safe(m.reason, 500));
  } else {
    section = "Team Access";
    const names: Record<string, string> = {
      TEAM_ACCESS_MEMBER_APPROVED: "Member approved",
      TEAM_ACCESS_UPDATE: "Member access updated",
      TEAM_ACCESS_REACTIVATE: "Member reactivated",
      TEAM_ACCESS_SUSPEND: "Member suspended",
      TEAM_ACCESS_REVOKE: "Member revoked",
    };
    change = names[row.action] ?? "Member access changed";
    add("Previous status", safe(m.previousStatus, 40));
    add("New status", safe(m.nextStatus, 40));
    add("Previous roles", allowedRoles(m.previousRoles));
    add("New roles", allowedRoles(m.nextRoles) ?? allowedRoles(m.roles));
    add("Access expiration", safe(m.expiresAt, 40));
    add("Reason", safe(m.reason, 500));
  }
  return {
    id: row.id,
    section,
    change,
    adminEmail: safe(row.adminEmail, 320) ?? "unknown-admin",
    createdAt: row.createdAt.toISOString(),
    action: row.action,
    targetType: safe(row.targetType, 120) ?? "unknown",
    targetId: safe(row.targetId, 160),
    targetEmail: safe(row.targetEmail, 320),
    details,
  };
}
function permittedWhere(category: SettingsHistoryCategory): Prisma.AdminAuditLogWhereInput[] {
  const result: Prisma.AdminAuditLogWhereInput[] = [];
  if (category === "all" || category === "product" || category === "automation") {
    result.push({
      action: "FEATURE_CONTROL_UPDATED", targetType: "FeatureFlag",
      ...(category === "product" ? { metadata: { path: ["category"], equals: "Travel Search" } }
        : category === "automation" ? { metadata: { path: ["category"], equals: "Travel Automation" } } : {}),
    });
  }
  if (category === "all" || category === "team") {
    result.push({ action: { in: [...teamActions] }, targetType: "PreviewTester" });
  }
  if (category === "all" || category === "legacy") {
    result.push({ action: "ADMIN_NOTIFICATION_PREFERENCE_UPDATED", targetType: "AdminNotificationPreference" });
  }
  return result;
}
function scopeFor(query: SettingsQuery, now: Date): { scope: Scope; position: Position | null; resetCursor?: true } | null {
  if (!(query.range in windows || query.range === "today" || query.range === "all" || query.range === "custom") ||
    !categories.includes(query.category) || (query.limit !== undefined && query.limit !== 6 && query.limit !== 25)) return null;
  const timeZone = resolveAdminTimeZone(query.timeZone);
  const custom = query.range === "custom" ? adminCustomDateRange(query.fromDate ?? "", query.toDate ?? "", now, timeZone) : null;
  if (query.range === "custom" && !custom) return null;
  const calendarRange = query.range === "today" || query.range === "custom";
  const fromIso = custom ? custom.from.toISOString()
    : query.range === "all" ? "1970-01-01T00:00:00.000Z"
    : query.range === "today" ? viewerTodayStart(now, timeZone)
    : new Date(now.getTime() - windows[query.range as keyof typeof windows]).toISOString();
  const scope: Scope = {
    range: query.range,
    category: query.category,
    from: fromIso,
    to: (custom?.to ?? now).toISOString(),
    ...(calendarRange ? { timeZone } : {}),
  };
  if (!query.cursor) return { scope, position: null };
  if (query.cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(query.cursor)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8")) as Record<string, unknown>;
    const payload = decoded.scope as Scope | undefined;
    if (decoded.v !== 1 || !payload || payload.range !== query.range || payload.category !== query.category ||
      typeof payload.from !== "string" || typeof payload.to !== "string" ||
      typeof decoded.at !== "string" || typeof decoded.id !== "string" ||
      !/^[A-Za-z0-9_-]{6,128}$/.test(decoded.id)) return null;
    const from = Date.parse(payload.from), to = Date.parse(payload.to), at = Date.parse(decoded.at);
    if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(at) ||
      to > now.getTime() || from >= to || at < from || at >= to) return null;

    if (calendarRange && (payload.timeZone ?? ADMIN_DEFAULT_TIME_ZONE) !== timeZone) {
      return { scope, position: null, resetCursor: true };
    }
    if (query.range === "all") {
      if (payload.from !== scope.from) return null;
    } else if (query.range === "custom") {
      if (payload.from !== scope.from || to > Date.parse(scope.to)) return null;
    } else if (query.range === "today") {
      if (payload.from !== viewerTodayStart(new Date(to), timeZone)) return null;
      if (payload.from !== scope.from) return { scope, position: null, resetCursor: true };
    } else if (to - from !== windows[query.range]) return null;

    return { scope: payload, position: { at: new Date(at).toISOString(), id: decoded.id } };
  } catch { return null; }
}

function nextCursor(scope: Scope, position: Position) {
  return Buffer.from(JSON.stringify({ v: 1, scope, ...position }), "utf8").toString("base64url");
}

export function createAdminSettingsHistoryReader(dependencies: Dependencies) {
  return {
    async list(query: SettingsQuery): Promise<SettingsHistoryResult> {
      try {
        if (!(await dependencies.authorize())) return { status: "forbidden" };
        const parsed = scopeFor(query, (dependencies.now ?? (() => new Date()))());
        if (!parsed) return { status: "invalid" };
        const db = dependencies.database();
        if (!db) return { status: "unavailable" };
        const { scope, position } = parsed;
        const limit = query.limit ?? 25;
        const rows = await db.adminAuditLog.findMany({
          select,
          where: {
            createdAt: { gte: new Date(scope.from), lt: new Date(scope.to) },
            AND: [
              { OR: permittedWhere(scope.category) },
              ...(position ? [{ OR: [
                { createdAt: { lt: new Date(position.at) } },
                { createdAt: new Date(position.at), id: { lt: position.id } },
              ] }] : []),
            ],
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
        });
        const page = rows.slice(0, limit);
        const last = page.at(-1);
        return {
          status: "ok",
          items: page.map(describe),
          ...(parsed.resetCursor ? { resetCursor: true } : {}),
          nextCursor: rows.length > limit && last
            ? nextCursor(scope, { at: last.createdAt.toISOString(), id: last.id }) : null,
        };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
