import "server-only";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { adminJourneys } from "@/services/adminJourneyService";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";
import { getWebsitePresenceSnapshot } from "@/services/websitePresenceService";
import { summarizeAccountStatusRows, summarizeAuditEvents, summarizeWorkflowStatusRows } from "@/services/adminOverviewMetrics";

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

  // This is an observation window, not the lifetime of an enabled account.
  const recentVisitorCutoff = new Date(now.getTime() - 5 * 60 * 1000);
  const db = getOptionalPrisma();
  if (!db) return { status: "unavailable" as const };

  try {
    const [journeys, providers, websitePresence, lifecycle] = await Promise.all([
      adminJourneys.summary({ from, to, environment }),
      getProviderOperationalStatuses(24, environment),
      getWebsitePresenceSnapshot(environment, now),
      db.$transaction(async tx => {
        const [userGroups, supportGroups, deletionGroups, adminActions, humanAdminActions, observedVisitorIdentities] = await Promise.all([
          tx.user.groupBy({
            by: ["status", "role"],
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
          tx.adminAuditLog.count({ where: { createdAt: { gte: new Date(from), lt: new Date(to) }, adminUserId: { not: null } } }),
          // Only currently consented visitor identities observed during the last five minutes.
          // A browser/device identity is not necessarily one unique human or every online visitor.
          tx.visitor.count({
            where: {
              consentStatus: "GRANTED",
              trackingDisabledAt: null,
              lastSeenAt: { gte: recentVisitorCutoff, lte: now },
            },
          }),
        ]);
        return { userGroups, supportGroups, deletionGroups, adminActions, humanAdminActions, observedVisitorIdentities };
      }, { isolationLevel: "RepeatableRead" }),
    ]);

    if (journeys.status !== "ok" || !providers) return { status: "unavailable" as const };

    const users = summarizeAccountStatusRows(lifecycle.userGroups);
    const audit = summarizeAuditEvents(lifecycle.adminActions, lifecycle.humanAdminActions);
    const supportCount = summarizeWorkflowStatusRows(
      lifecycle.supportGroups,
      ["OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"] as const,
    );
    const deletionCount = summarizeWorkflowStatusRows(
      lifecycle.deletionGroups,
      ["PENDING", "READY_FOR_REVIEW", "CANCELLED", "COMPLETED"] as const,
    );


    return {
      status: "ok" as const,
      data: {
        scope: { from, to, environment },
        websitePresence,
        visitorActivity: {
          observedVisitorIdentities: lifecycle.observedVisitorIdentities,
          windowMinutes: 5,
          observedAt: now.toISOString(),
        },
        users,
        support: {
          open: supportCount.OPEN,
          waitingOnUser: supportCount.WAITING_ON_USER,
          waitingOnTeam: supportCount.WAITING_ON_TEAM,
          resolvedOrClosed:
            supportCount.RESOLVED + supportCount.CLOSED,
        },
        deletions: {
          pending: deletionCount.PENDING,
          readyForReview: deletionCount.READY_FOR_REVIEW,
          cancelled: deletionCount.CANCELLED,
          completed: deletionCount.COMPLETED,
        },
        journeys: journeys.data,
        providers,
        adminActions: lifecycle.adminActions,
        audit,
      },
    };
  } catch {
    return { status: "unavailable" as const };
  }
}
