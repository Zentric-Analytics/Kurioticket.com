import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import {
  getProviderIntegrationStatuses,
  type ProviderIntegrationStatus,
} from "@/services/travel/providerIntegrationStatus";

export type ProviderOperationalState =
  | "NOT_READY"
  | "NO_RECENT_ACTIVITY"
  | "HEALTHY"
  | "DEGRADED"
  | "FAILING";

export type ProviderOperationalStatus = {
  id: ProviderIntegrationStatus["id"];
  provider: string;
  readinessState: ProviderIntegrationStatus["state"];
  operationalState: ProviderOperationalState;
  windowHours: number;
  totalCalls: number;
  successCalls: number;
  degradedCalls: number;
  failedCalls: number;
  disabledCalls: number;
  averageLatencyMs: number | null;
  lastActivityAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
};

type Database = Pick<PrismaClient, "apiProviderLog">;
type Dependencies = {
  database: () => Database | null;
  readiness: () => ProviderIntegrationStatus[];
  environment: () => PublicEnvironment;
  now?: () => Date;
};

const providerNames: Record<ProviderIntegrationStatus["id"], string> = {
  duffel: "Duffel",
  "kayak-sandbox": "KAYAK sandbox",
};

function state(readiness: ProviderIntegrationStatus, counts: { total: number; success: number; degraded: number; failed: number }) : ProviderOperationalState {
  if (readiness.state !== "READY") return "NOT_READY";
  if (counts.total === 0) return "NO_RECENT_ACTIVITY";
  if (counts.failed > 0 && counts.success === 0) return "FAILING";
  if (counts.failed > 0 || counts.degraded > 0) return "DEGRADED";
  return "HEALTHY";
}

export function createProviderOperationalStatusReader(dependencies: Dependencies) {
  return async function readProviderOperationalStatuses(windowHours = 24): Promise<ProviderOperationalStatus[] | null> {
    const db = dependencies.database();
    if (!db) return null;
    const hours = Number.isInteger(windowHours) && windowHours >= 1 && windowHours <= 168 ? windowHours : 24;
    const now = (dependencies.now ?? (() => new Date()))();
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const environment = dependencies.environment();
    const readiness = dependencies.readiness();

    return Promise.all(readiness.map(async integration => {
      const provider = providerNames[integration.id];
      const where = {
        provider,
        createdAt: { gte: since, lte: now },
        metadata: { path: ["environment"], equals: environment },
      } as const;
      const [
        totalCalls,
        successCalls,
        degradedCalls,
        failedCalls,
        disabledCalls,
        latency,
        lastActivity,
        lastSuccess,
        lastFailure,
      ] = await Promise.all([
        db.apiProviderLog.count({ where }),
        db.apiProviderLog.count({ where: { ...where, status: "SUCCESS" } }),
        db.apiProviderLog.count({ where: { ...where, status: "DEGRADED" } }),
        db.apiProviderLog.count({ where: { ...where, status: "FAILED" } }),
        db.apiProviderLog.count({ where: { ...where, status: "DISABLED" } }),
        db.apiProviderLog.aggregate({ where, _avg: { latencyMs: true } }),
        db.apiProviderLog.findFirst({ where, select: { createdAt: true }, orderBy: { createdAt: "desc" } }),
        db.apiProviderLog.findFirst({ where: { ...where, status: "SUCCESS" }, select: { createdAt: true }, orderBy: { createdAt: "desc" } }),
        db.apiProviderLog.findFirst({ where: { ...where, status: "FAILED" }, select: { createdAt: true }, orderBy: { createdAt: "desc" } }),
      ]);
      const observedCalls = successCalls + degradedCalls + failedCalls;
      const counts = {
        total: observedCalls,
        success: successCalls,
        degraded: degradedCalls,
        failed: failedCalls,
      };
      return {
        id: integration.id,
        provider,
        readinessState: integration.state,
        operationalState: state(integration, counts),
        windowHours: hours,
        totalCalls,
        successCalls,
        degradedCalls,
        failedCalls,
        disabledCalls,
        averageLatencyMs: latency._avg.latencyMs === null
          ? null
          : Math.round(latency._avg.latencyMs),
        lastActivityAt: lastActivity?.createdAt.toISOString() ?? null,
        lastSuccessAt: lastSuccess?.createdAt.toISOString() ?? null,
        lastFailureAt: lastFailure?.createdAt.toISOString() ?? null,
      };
    }));
  };
}

export const getProviderOperationalStatuses = createProviderOperationalStatusReader({
  database: getOptionalPrisma,
  readiness: getProviderIntegrationStatuses,
  environment: getPublicEnvironment,
});
