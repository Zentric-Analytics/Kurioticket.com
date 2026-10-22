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
  const environment = params.get("environment") ?? getPublicEnvironment();
  if (environment !== "staging" && environment !== "production") {
    return { status: "invalid" as const, issues: [{ field: "environment", message: "Invalid environment." }] };
  }
  const to = new Date(params.get("to") ?? now).toISOString();
  const from = new Date(params.get("from") ?? new Date(new Date(to).getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString();
  if (Date.parse(from) >= Date.parse(to) || Date.parse(to) > now.getTime() || Date.parse(to) - Date.parse(from) > 90 * 24 * 60 * 60 * 1000) {
    return { status: "invalid" as const, issues: [{ field: "from", message: "Use a past time range of more than zero and at most 90 days." }] };
  }

  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" as const };

  try {
    const [journeys, providers, users, support, deletions, adminActions] = await Promise.all([
      adminJourneys.summary({ from, to, environment }),
      getProviderOperationalStatuses(24),
      Promise.all([
        db.user.count(),
        db.user.count({ where: { status: "ACTIVE" } }),
        db.user.count({ where: { status: "SUSPENDED" } }),
        db.user.count({ where: { status: "PENDING_DELETION" } }),
        db.user.count({ where: { status: "DELETED" } }),
      ]),
      Promise.all([
        db.supportTicket.count({ where: { status: "OPEN" } }),
        db.supportTicket.count({ where: { status: "WAITING_ON_USER" } }),
        db.supportTicket.count({ where: { status: "WAITING_ON_TEAM" } }),
        db.supportTicket.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
      ]),
      Promise.all([
        db.accountDeletionRequest.count({ where: { status: "PENDING" } }),
        db.accountDeletionRequest.count({ where: { status: "READY_FOR_REVIEW" } }),
        db.accountDeletionRequest.count({ where: { status: "CANCELLED" } }),
        db.accountDeletionRequest.count({ where: { status: "COMPLETED" } }),
      ]),
      db.adminAuditLog.count({ where: { createdAt: { gte: new Date(from), lt: new Date(to) } } }),
    ]);

    if (journeys.status !== "ok" || !providers) return { status: "unavailable" as const };

    return {
      status: "ok" as const,
      data: {
        scope: { from, to, environment },
        users: {
          total: users[0],
          active: users[1],
          suspended: users[2],
          pendingDeletion: users[3],
          deleted: users[4],
        },
        support: {
          open: support[0],
          waitingOnUser: support[1],
          waitingOnTeam: support[2],
          resolvedOrClosed: support[3],
        },
        deletions: {
          pending: deletions[0],
          readyForReview: deletions[1],
          cancelled: deletions[2],
          completed: deletions[3],
        },
        journeys: journeys.data,
        providers,
        adminActions,
      },
    };
  } catch {
    return { status: "unavailable" as const };
  }
}
