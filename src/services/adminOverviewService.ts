import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { adminJourneys } from "@/services/adminJourneyService";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";

function invalidDate(value: string | null) {
  return value !== null && (!Number.isFinite(Date.parse(value)) || !/(Z|[+-]\d{2}:\d{2})$/.test(value));
}

export async function getAdminOverview(params: URLSearchParams) {
  const auth = await requireAdminApiSession();
  if (auth.response) return { status: "forbidden" as const };

  const now = new Date();
  if (invalidDate(params.get("from")) || invalidDate(params.get("to"))) {
    return { status: "invalid" as const, issues: [{ field: "date", message: "Use ISO timestamps with an explicit timezone." }] };
  }
  for (const key of params.keys()) {
    if (!["from", "to", "environment"].includes(key) || params.getAll(key).length > 1) {
      return { status: "invalid" as const, issues: [{ field: key, message: "Unsupported or repeated query parameter." }] };
    }
  }
  const hostEnvironment = getPublicEnvironment();
  const environment = params.get("environment") ?? hostEnvironment;
  if (environment !== "staging" && environment !== "production") {
    return { status: "invalid" as const, issues: [{ field: "environment", message: "Invalid environment." }] };
  }
  if (environment !== hostEnvironment) {
    return {
      status: "invalid" as const,
      issues: [{
        field: "environment",
        message: "Overview provider readiness is available only for the current deployment environment.",
      }],
    };
  }
  const to = new Date(params.get("to") ?? now).toISOString();
  const from = new Date(params.get("from") ?? new Date(new Date(to).getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString();
  if (Date.parse(from) >= Date.parse(to) || Date.parse(to) > now.getTime() || Date.parse(to) - Date.parse(from) > 90 * 24 * 60 * 60 * 1000) {
    return { status: "invalid" as const, issues: [{ field: "from", message: "Use a past time range of more than zero and at most 90 days." }] };
  }

  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" as const };

  try {
    const [journeys, providers, lifecycle] = await Promise.all([
      adminJourneys.summary({ from, to, environment }),
      getProviderOperationalStatuses(24, environment),
      db.$transaction(async tx => {
        const [userGroups, supportGroups, deletionGroups, adminActions] = await Promise.all([
          tx.user.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          tx.supportTicket.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          tx.accountDeletionRequest.groupBy({
            by: ["status"],
            _count: { _all: true },
          }),
          tx.adminAuditLog.count({
            where: { createdAt: { gte: new Date(from), lt: new Date(to) } },
          }),
        ]);
        return { userGroups, supportGroups, deletionGroups, adminActions };
      }, { isolationLevel: "RepeatableRead" }),
    ]);

    if (journeys.status !== "ok" || !providers) return { status: "unavailable" as const };

    const userCount = new Map(lifecycle.userGroups.map(row => [row.status, row._count._all]));
    const supportCount = new Map(lifecycle.supportGroups.map(row => [row.status, row._count._all]));
    const deletionCount = new Map(lifecycle.deletionGroups.map(row => [row.status, row._count._all]));
    const totalUsers = lifecycle.userGroups.reduce((sum, row) => sum + row._count._all, 0);

    return {
      status: "ok" as const,
      data: {
        scope: { from, to, environment },
        users: {
          total: totalUsers,
          active: userCount.get("ACTIVE") ?? 0,
          suspended: userCount.get("SUSPENDED") ?? 0,
          pendingDeletion: userCount.get("PENDING_DELETION") ?? 0,
          deleted: userCount.get("DELETED") ?? 0,
        },
        support: {
          open: supportCount.get("OPEN") ?? 0,
          waitingOnUser: supportCount.get("WAITING_ON_USER") ?? 0,
          waitingOnTeam: supportCount.get("WAITING_ON_TEAM") ?? 0,
          resolvedOrClosed:
            (supportCount.get("RESOLVED") ?? 0) + (supportCount.get("CLOSED") ?? 0),
        },
        deletions: {
          pending: deletionCount.get("PENDING") ?? 0,
          readyForReview: deletionCount.get("READY_FOR_REVIEW") ?? 0,
          cancelled: deletionCount.get("CANCELLED") ?? 0,
          completed: deletionCount.get("COMPLETED") ?? 0,
        },
        journeys: journeys.data,
        providers,
        adminActions: lifecycle.adminActions,
      },
    };
  } catch {
    return { status: "unavailable" as const };
  }
}
