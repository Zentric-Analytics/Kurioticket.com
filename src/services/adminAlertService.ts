import "server-only";

import { createHash } from "node:crypto";

import { getOptionalPrisma } from "@/lib/prisma";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";
import { getEmailDeliveryHealthSnapshot } from "@/services/emailDeliveryService";
import {
  getFlightStatusIntegrationReadiness,
  getFlightStatusOperationsSnapshot,
} from "@/services/adminFlightStatusOperationsService";
import { readHomepageFareSnapshotStatus } from "@/services/homepageFareSnapshotService";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";
import {
  deriveAdminAlertCandidates,
  type AdminAlertCandidate,
  type AdminAlertSeverity,
  type AdminAlertSignals,
  type AdminAlertSource,
} from "@/services/adminAlertCore";

const ACK_ACTION = "ADMIN_ALERT_ACKNOWLEDGED";
const ACK_TARGET_TYPE = "AdminOperationalAlert";
const ACK_WINDOW_MS = 24 * 60 * 60 * 1_000;
const CANDIDATE_CACHE_TTL_MS = 30_000;

let candidateCache:
  | { candidates: AdminAlertCandidate[]; expiresAt: number }
  | null = null;
let candidateRefreshPromise: Promise<AdminAlertCandidate[]> | null = null;

type AckMetadata = {
  alertKey?: unknown;
  signalToken?: unknown;
};

export type AdminOperationalAlert = AdminAlertCandidate & {
  id: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
};

export type AdminAlertSnapshot = {
  generatedAt: string;
  activeCount: number;
  unreadCount: number;
  criticalCount: number;
  warningCount: number;
  alerts: AdminOperationalAlert[];
};

export type AdminAlertSummary = Omit<AdminAlertSnapshot, "alerts">;

export async function getAdminAlertSnapshot(
  adminUserId?: string | null,
  now = new Date(),
  options: { forceRefreshCandidates?: boolean } = {},
): Promise<AdminAlertSnapshot> {
  const alerts = await getAdminOperationalAlerts(
    adminUserId,
    now,
    options.forceRefreshCandidates !== false,
  );

  return {
    generatedAt: now.toISOString(),
    activeCount: alerts.length,
    unreadCount: alerts.filter((alert) => !alert.acknowledged).length,
    criticalCount: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    warningCount: alerts.filter((alert) => alert.severity === "WARNING").length,
    alerts,
  };
}

export async function getAdminAlertSummary(
  adminUserId?: string | null,
  now = new Date(),
): Promise<AdminAlertSummary> {
  const alerts = await getAdminOperationalAlerts(adminUserId, now, false);
  return {
    generatedAt: now.toISOString(),
    activeCount: alerts.length,
    unreadCount: alerts.filter((alert) => !alert.acknowledged).length,
    criticalCount: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    warningCount: alerts.filter((alert) => alert.severity === "WARNING").length,
  };
}

export async function getAdminAlertUnreadCount(
  adminUserId?: string | null,
): Promise<number> {
  return (await getAdminAlertSummary(adminUserId)).unreadCount;
}

async function getAdminOperationalAlerts(
  adminUserId: string | null | undefined,
  now: Date,
  forceRefreshCandidates: boolean,
): Promise<AdminOperationalAlert[]> {
  const [candidates, acknowledgements] = await Promise.all([
    readAdminAlertCandidates(now, forceRefreshCandidates),
    adminUserId
      ? readRecentAcknowledgements(adminUserId, now)
      : Promise.resolve(new Map<string, string>()),
  ]);

  return candidates
    .map((candidate) => {
      const ackKey = acknowledgementKey(candidate.key, candidate.signalToken);
      const acknowledgedAt = acknowledgements.get(ackKey) ?? null;
      return {
        ...candidate,
        id: ackKey,
        acknowledged: Boolean(acknowledgedAt),
        acknowledgedAt,
      };
    })
    .sort(compareAlerts);
}

async function readAdminAlertCandidates(
  now: Date,
  forceRefresh = false,
): Promise<AdminAlertCandidate[]> {
  if (!forceRefresh && candidateCache && candidateCache.expiresAt > now.getTime()) {
    return candidateCache.candidates;
  }

  if (candidateRefreshPromise) return candidateRefreshPromise;

  candidateRefreshPromise = loadAdminAlertCandidates()
    .then((candidates) => {
      candidateCache = {
        candidates,
        expiresAt: now.getTime() + CANDIDATE_CACHE_TTL_MS,
      };
      return candidates;
    })
    .finally(() => {
      candidateRefreshPromise = null;
    });

  return candidateRefreshPromise;
}

async function loadAdminAlertCandidates(): Promise<AdminAlertCandidate[]> {
  const readiness = getFlightStatusIntegrationReadiness();

  const [system, providers, email, cms, homepageFares, flightStatusOperations] =
    await Promise.all([
      getSafeSystemStatus(),
      getProviderOperationalStatuses().catch((error) => {
        console.error("[admin-alerts:providers]", error);
        return null;
      }),
      getEmailDeliveryHealthSnapshot().catch((error) => {
        console.error("[admin-alerts:email]", error);
        return null;
      }),
      getCmsHealthOverview().catch((error) => {
        console.error("[admin-alerts:cms]", error);
        return null;
      }),
      readHomepageFareSnapshotStatus().catch((error) => {
        console.error("[admin-alerts:homepage-fares]", error);
        return null;
      }),
      readiness.feedReady
        ? getFlightStatusOperationsSnapshot().catch((error) => {
            console.error("[admin-alerts:flight-status]", error);
            return null;
          })
        : Promise.resolve(null),
    ]);

  const signals: AdminAlertSignals = {
    system,
    providers,
    email,
    cms: cms
      ? {
          ...cms,
          unhealthyFingerprint: cmsUnhealthyFingerprint(cms),
        }
      : null,
    homepageFares,
    flightStatus: {
      feedReady: readiness.feedReady,
      operations: flightStatusOperations,
    },
  };

  return deriveAdminAlertCandidates(signals);
}

function cmsUnhealthyFingerprint(
  cms: Awaited<ReturnType<typeof getCmsHealthOverview>>,
) {
  const failures = cms.scopes
    .filter((scope) => !scope.integrity.healthy)
    .map((scope) => ({
      scope: [scope.type, scope.market, scope.locale],
      inactive: !scope.integrity.active,
      invalidDrafts: scope.integrity.invalidDrafts
        .map((item) => [item.id, item.key])
        .sort(),
      invalidPublished: scope.integrity.invalidPublished
        .map((item) => [item.id, item.key])
        .sort(),
      orphanPublished: scope.integrity.orphanPublished
        .map((item) => [item.id, item.key])
        .sort(),
      draftOrderCollisions: scope.integrity.draftOrderCollisions
        .map((entry) => [entry.order, [...entry.ids].sort()] as const)
        .sort((a, b) => a[0] - b[0]),
      publishedOrderCollisions: scope.integrity.publishedOrderCollisions
        .map((entry) => [entry.order, [...entry.ids].sort()] as const)
        .sort((a, b) => a[0] - b[0]),
      draftOrderNeedsNormalization: scope.integrity.draftOrderNeedsNormalization,
    }))
    .sort((a, b) => JSON.stringify(a.scope).localeCompare(JSON.stringify(b.scope)));

  return createHash("sha256")
    .update(JSON.stringify(failures))
    .digest("hex")
    .slice(0, 24);
}

export function acknowledgementKey(alertKey: string, signalToken: string) {
  return `${alertKey}::${signalToken}`;
}

export async function getCurrentAdminAlertByKey(
  alertKey: string,
  adminUserId?: string | null,
) {
  const snapshot = await getAdminAlertSnapshot(adminUserId, new Date(), {
    forceRefreshCandidates: true,
  });
  return snapshot.alerts.find((alert) => alert.key === alertKey) ?? null;
}

export const adminAlertAcknowledgement = {
  action: ACK_ACTION,
  targetType: ACK_TARGET_TYPE,
  windowMs: ACK_WINDOW_MS,
};

async function readRecentAcknowledgements(
  adminUserId: string,
  now: Date,
): Promise<Map<string, string>> {
  const db = getOptionalPrisma();
  if (!db) return new Map();

  const since = new Date(now.getTime() - ACK_WINDOW_MS);

  try {
    const rows = await db.adminAuditLog.findMany({
      where: {
        adminUserId,
        action: ACK_ACTION,
        targetType: ACK_TARGET_TYPE,
        createdAt: { gte: since, lte: now },
      },
      select: {
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const result = new Map<string, string>();

    for (const row of rows) {
      const metadata = (row.metadata ?? {}) as AckMetadata;
      const alertKey =
        typeof metadata.alertKey === "string" ? metadata.alertKey : "";
      const signalToken =
        typeof metadata.signalToken === "string" ? metadata.signalToken : "";

      if (!alertKey || !signalToken) continue;

      const key = acknowledgementKey(alertKey, signalToken);
      if (!result.has(key)) result.set(key, row.createdAt.toISOString());
    }

    return result;
  } catch (error) {
    console.error("[admin-alerts:acknowledgements]", error);
    return new Map();
  }
}

function compareAlerts(a: AdminOperationalAlert, b: AdminOperationalAlert) {
  if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;

  const severityRank: Record<AdminAlertSeverity, number> = {
    CRITICAL: 0,
    WARNING: 1,
  };
  if (severityRank[a.severity] !== severityRank[b.severity]) {
    return severityRank[a.severity] - severityRank[b.severity];
  }

  const sourceRank: Record<AdminAlertSource, number> = {
    SYSTEM: 0,
    PROVIDER: 1,
    EMAIL: 2,
    CMS: 3,
    HOMEPAGE_FARES: 4,
    FLIGHT_STATUS: 5,
  };
  return sourceRank[a.source] - sourceRank[b.source] || a.title.localeCompare(b.title);
}
