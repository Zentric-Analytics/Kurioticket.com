import "server-only";

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

export async function getAdminAlertSnapshot(
  adminUserId?: string | null,
  now = new Date(),
): Promise<AdminAlertSnapshot> {
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
    cms,
    homepageFares,
    flightStatus: {
      feedReady: readiness.feedReady,
      operations: flightStatusOperations,
    },
  };

  const candidates = deriveAdminAlertCandidates(signals);
  const acknowledgements = adminUserId
    ? await readRecentAcknowledgements(adminUserId, now)
    : new Map<string, string>();

  const alerts = candidates
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

  return {
    generatedAt: now.toISOString(),
    activeCount: alerts.length,
    unreadCount: alerts.filter((alert) => !alert.acknowledged).length,
    criticalCount: alerts.filter((alert) => alert.severity === "CRITICAL").length,
    warningCount: alerts.filter((alert) => alert.severity === "WARNING").length,
    alerts,
  };
}

export async function getAdminAlertUnreadCount(
  adminUserId?: string | null,
): Promise<number> {
  return (await getAdminAlertSnapshot(adminUserId)).unreadCount;
}

export function acknowledgementKey(alertKey: string, signalToken: string) {
  return `${alertKey}::${signalToken}`;
}

export async function getCurrentAdminAlertByKey(
  alertKey: string,
  adminUserId?: string | null,
) {
  const snapshot = await getAdminAlertSnapshot(adminUserId);
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
