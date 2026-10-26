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
import { getPartnerConfirmationBinding, getConfirmationDeliveryHealth } from "@/services/partnerConfirmationDeliveryService";
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
const TELEMETRY_STATE_ACTION = "ADMIN_ALERT_TELEMETRY_STATE";
const TELEMETRY_STATE_TARGET_TYPE = "AdminOperationalTelemetry";
const CMS_STATE_ACTION = "ADMIN_ALERT_CMS_STATE";
const CMS_STATE_TARGET_TYPE = "AdminCmsIntegrity";

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

export function getDatabaseOutageAlertSnapshot(
  now = new Date(),
): AdminAlertSnapshot {
  const alert: AdminOperationalAlert = {
    id: "system.database.unavailable::database-outage",
    key: "system.database.unavailable",
    severity: "CRITICAL",
    source: "SYSTEM",
    title: "Database is unavailable",
    message:
      "The configured database did not respond to the admin health check. Only this outage status is available until canonical admin session validation can recover.",
    actionHref: "/admin/notifications",
    signalToken: "database-outage",
    signalAt: now.toISOString(),
    acknowledged: false,
    acknowledgedAt: null,
  };

  return {
    generatedAt: now.toISOString(),
    activeCount: 1,
    unreadCount: 1,
    criticalCount: 1,
    warningCount: 0,
    alerts: [alert],
  };
}

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
  const candidates = await readAdminAlertCandidates(
    now,
    forceRefreshCandidates,
  );
  const acknowledgements = adminUserId
    ? await readRecentAcknowledgements(adminUserId, candidates, now)
    : new Map<string, string>();

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

  candidateRefreshPromise = loadAdminAlertCandidates(now)
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

async function loadAdminAlertCandidates(now: Date): Promise<AdminAlertCandidate[]> {
  const readiness = getFlightStatusIntegrationReadiness();
  const confirmationBinding = getPartnerConfirmationBinding();

  const [system, providers, email, cms, homepageFares, flightStatusOperations, confirmationHealth] =
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
      confirmationBinding.configured
        ? getConfirmationDeliveryHealth().catch((error) => {
            console.error("[admin-alerts:confirmation-deliveries]", error);
            return null;
          })
        : Promise.resolve(null),
    ]);

  const telemetryOutageTokens = await readTelemetryOutageTokens(
    {
      providers: providers === null,
      email: email === null || !email.dataAvailable,
      cms: cms === null,
      "homepage-fares":
        homepageFares === null || !homepageFares.dataAvailable,
      "flight-status":
        readiness.feedReady && flightStatusOperations === null,
    },
    now,
  );

  const cmsFingerprint = cms ? cmsUnhealthyFingerprint(cms) : null;
  const cmsOccurrenceToken = cms
    ? await readCmsIntegrityOccurrenceToken(cms, cmsFingerprint!, now)
    : "cms-unavailable";

  const signals: AdminAlertSignals = {
    system,
    providers,
    email,
    cms: cms
      ? {
          ...cms,
          unhealthyFingerprint: cmsFingerprint!,
          occurrenceToken: cmsOccurrenceToken,
        }
      : null,
    homepageFares,
    telemetryOutageTokens: {
      providers: telemetryOutageTokens.providers,
      email: telemetryOutageTokens.email,
      cms: telemetryOutageTokens.cms,
      homepageFares: telemetryOutageTokens["homepage-fares"],
      flightStatus: telemetryOutageTokens["flight-status"],
    },
    confirmedTrips: {
      feedReady: confirmationBinding.configured,
      health: confirmationHealth,
    },
    flightStatus: {
      feedReady: readiness.feedReady,
      operations: flightStatusOperations,
    },
  };

  return deriveAdminAlertCandidates(signals);
}

type TelemetrySource =
  | "providers"
  | "email"
  | "cms"
  | "homepage-fares"
  | "flight-status";

type TelemetryStateMetadata = {
  state?: unknown;
  occurrenceToken?: unknown;
};

async function readTelemetryOutageTokens(
  unavailableBySource: Record<TelemetrySource, boolean>,
  now: Date,
): Promise<Record<TelemetrySource, string>> {
  const db = getOptionalPrisma();
  const sources = Object.keys(unavailableBySource) as TelemetrySource[];
  const result = Object.fromEntries(
    sources.map((source) => [source, unavailableBySource[source] ? `outage:${source}:ephemeral:${now.toISOString()}` : "available"]),
  ) as Record<TelemetrySource, string>;

  if (!db) return result;

  try {
    const latestRows = await Promise.all(
      sources.map(async (source) => ({
        source,
        row: await db.adminAuditLog.findFirst({
          where: {
            action: TELEMETRY_STATE_ACTION,
            targetType: TELEMETRY_STATE_TARGET_TYPE,
            targetId: source,
          },
          select: {
            metadata: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        }),
      })),
    );

    const latest = new Map<
      TelemetrySource,
      { state: "AVAILABLE" | "OUTAGE"; occurrenceToken: string | null; createdAt: Date }
    >();

    for (const { source, row } of latestRows) {
      if (!row) continue;
      const metadata = (row.metadata ?? {}) as TelemetryStateMetadata;
      const state =
        metadata.state === "AVAILABLE" || metadata.state === "OUTAGE"
          ? metadata.state
          : null;
      if (!state) continue;
      latest.set(source, {
        state,
        occurrenceToken:
          typeof metadata.occurrenceToken === "string"
            ? metadata.occurrenceToken
            : null,
        createdAt: row.createdAt,
      });
    }

    for (const source of sources) {
      const unavailable = unavailableBySource[source];
      const previous = latest.get(source);

      if (!unavailable) {
        result[source] = "available";
        if (previous?.state === "OUTAGE") {
          await db.adminAuditLog.create({
            data: {
              adminEmail: "system-alert-monitor",
              action: TELEMETRY_STATE_ACTION,
              targetType: TELEMETRY_STATE_TARGET_TYPE,
              targetId: source,
              metadata: { state: "AVAILABLE" },
            },
          });
        }
        continue;
      }

      if (previous?.state === "OUTAGE" && previous.occurrenceToken) {
        result[source] = previous.occurrenceToken;
        continue;
      }

      const recoveryBoundary =
        previous?.state === "AVAILABLE"
          ? previous.createdAt.toISOString()
          : "initial";
      const occurrenceToken =
        `outage:${source}:${createHash("sha256")
          .update(`${source}:${recoveryBoundary}`)
          .digest("hex")
          .slice(0, 24)}`;

      result[source] = occurrenceToken;
      await db.adminAuditLog.create({
        data: {
          adminEmail: "system-alert-monitor",
          action: TELEMETRY_STATE_ACTION,
          targetType: TELEMETRY_STATE_TARGET_TYPE,
          targetId: source,
          metadata: {
            state: "OUTAGE",
            occurrenceToken,
          },
        },
      });
    }
  } catch (error) {
    console.error("[admin-alerts:telemetry-state]", error);
  }

  return result;
}

type CmsStateMetadata = {
  state?: unknown;
  fingerprint?: unknown;
  recoveryBoundary?: unknown;
};

async function readCmsIntegrityOccurrenceToken(
  cms: Awaited<ReturnType<typeof getCmsHealthOverview>>,
  fingerprint: string,
  now: Date,
) {
  const db = getOptionalPrisma();
  if (!db) return `cms-integrity:${fingerprint}`;

  const unhealthy = cms.available && cms.totals.unhealthy > 0;

  try {
    const latest = await db.adminAuditLog.findFirst({
      where: {
        action: CMS_STATE_ACTION,
        targetType: CMS_STATE_TARGET_TYPE,
        targetId: "cms-integrity",
      },
      select: { metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    const metadata = (latest?.metadata ?? {}) as CmsStateMetadata;
    const previousState =
      metadata.state === "HEALTHY" || metadata.state === "UNHEALTHY"
        ? metadata.state
        : null;
    const previousFingerprint =
      typeof metadata.fingerprint === "string" ? metadata.fingerprint : null;
    const previousRecoveryBoundary =
      typeof metadata.recoveryBoundary === "string"
        ? metadata.recoveryBoundary
        : null;

    if (!unhealthy) {
      if (previousState === "UNHEALTHY") {
        const recoveryBoundary = now.toISOString();
        await db.adminAuditLog.create({
          data: {
            adminEmail: "system-alert-monitor",
            action: CMS_STATE_ACTION,
            targetType: CMS_STATE_TARGET_TYPE,
            targetId: "cms-integrity",
            metadata: {
              state: "HEALTHY",
              fingerprint,
              recoveryBoundary,
            },
          },
        });
      }
      return `cms-integrity:${fingerprint}:healthy`;
    }

    const sameContinuousIncident =
      previousState === "UNHEALTHY" && previousFingerprint === fingerprint;
    const recoveryBoundary = sameContinuousIncident
      ? previousRecoveryBoundary ?? latest?.createdAt.toISOString() ?? "initial"
      : previousState === "HEALTHY"
        ? previousRecoveryBoundary ?? latest?.createdAt.toISOString() ?? now.toISOString()
        : now.toISOString();

    const occurrenceToken = `cms-integrity:${fingerprint}:${createHash("sha256")
      .update(`${fingerprint}:${recoveryBoundary}`)
      .digest("hex")
      .slice(0, 24)}`;

    if (!sameContinuousIncident) {
      await db.adminAuditLog.create({
        data: {
          adminEmail: "system-alert-monitor",
          action: CMS_STATE_ACTION,
          targetType: CMS_STATE_TARGET_TYPE,
          targetId: "cms-integrity",
          metadata: {
            state: "UNHEALTHY",
            fingerprint,
            recoveryBoundary,
          },
        },
      });
    }

    return occurrenceToken;
  } catch (error) {
    console.error("[admin-alerts:cms-state]", error);
    return `cms-integrity:${fingerprint}`;
  }
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
  candidates: AdminAlertCandidate[],
  now: Date,
): Promise<Map<string, string>> {
  const db = getOptionalPrisma();
  if (!db || candidates.length === 0) return new Map();

  const since = new Date(now.getTime() - ACK_WINDOW_MS);
  const activeAlertKeys = [...new Set(candidates.map((candidate) => candidate.key))];
  const activeAcknowledgementKeys = new Set(
    candidates.map((candidate) =>
      acknowledgementKey(candidate.key, candidate.signalToken),
    ),
  );

  try {
    const rows = await db.adminAuditLog.findMany({
      where: {
        adminUserId,
        action: ACK_ACTION,
        targetType: ACK_TARGET_TYPE,
        targetId: { in: activeAlertKeys },
        createdAt: { gte: since, lte: now },
      },
      select: {
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
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
      if (!activeAcknowledgementKeys.has(key) || result.has(key)) continue;
      result.set(key, row.createdAt.toISOString());
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
