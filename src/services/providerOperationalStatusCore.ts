import { Prisma } from "@/generated/prisma/client";
import type { PublicEnvironment } from "@/lib/stagingSafety";

export type ProviderOperationalState =
  | "NOT_READY"
  | "NO_RECENT_ACTIVITY"
  | "HEALTHY"
  | "DEGRADED"
  | "FAILING";

export type ProviderOperationalReadiness = {
  id: "duffel" | "kayak-sandbox";
  provider: string;
  state: "READY" | "DISABLED" | "NOT_CONFIGURED" | "ENVIRONMENT_BLOCKED";
};

export type ProviderOperationalStatus = {
  id: ProviderOperationalReadiness["id"];
  provider: string;
  readinessState: ProviderOperationalReadiness["state"];
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
  lastAdverseAt: string | null;
};

export type ProviderOperationalDatabase = Pick<Prisma.TransactionClient, "apiProviderLog">;

const providerNames: Record<ProviderOperationalReadiness["id"], string> = {
  duffel: "Duffel",
  "kayak-sandbox": "KAYAK sandbox",
};

function operationalState(
  readiness: ProviderOperationalReadiness,
  counts: { observed: number; success: number; degraded: number; failed: number },
): ProviderOperationalState {
  if (readiness.state !== "READY") return "NOT_READY";
  if (counts.observed === 0) return "NO_RECENT_ACTIVITY";
  if (counts.failed > 0 && counts.success === 0) return "FAILING";
  if (counts.failed > 0 || counts.degraded > 0) return "DEGRADED";
  return "HEALTHY";
}

export async function readProviderOperationalSnapshot(input: {
  database: ProviderOperationalDatabase;
  readiness: ProviderOperationalReadiness[];
  environment: PublicEnvironment;
  now: Date;
  windowHours?: number;
}): Promise<ProviderOperationalStatus[]> {
  const hours =
    Number.isInteger(input.windowHours) &&
    (input.windowHours ?? 0) >= 1 &&
    (input.windowHours ?? 0) <= 168
      ? input.windowHours as number
      : 24;
  const since = new Date(input.now.getTime() - hours * 60 * 60 * 1000);

  return Promise.all(
    input.readiness.map(async integration => {
      const provider = providerNames[integration.id];
      const where: Prisma.ApiProviderLogWhereInput = {
        provider,
        createdAt: { gte: since, lte: input.now },
        metadata: { path: ["environment"], equals: input.environment },
      };

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
        lastAdverse,
      ] = await Promise.all([
        input.database.apiProviderLog.count({ where }),
        input.database.apiProviderLog.count({ where: { ...where, status: "SUCCESS" } }),
        input.database.apiProviderLog.count({ where: { ...where, status: "DEGRADED" } }),
        input.database.apiProviderLog.count({ where: { ...where, status: "FAILED" } }),
        input.database.apiProviderLog.count({ where: { ...where, status: "DISABLED" } }),
        input.database.apiProviderLog.aggregate({ where, _avg: { latencyMs: true } }),
        input.database.apiProviderLog.findFirst({
          where,
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
        input.database.apiProviderLog.findFirst({
          where: { ...where, status: "SUCCESS" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
        input.database.apiProviderLog.findFirst({
          where: { ...where, status: "FAILED" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
        input.database.apiProviderLog.findFirst({
          where: { ...where, status: { in: ["FAILED", "DEGRADED"] } },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const observedCalls = successCalls + degradedCalls + failedCalls;

      return {
        id: integration.id,
        provider,
        readinessState: integration.state,
        operationalState: operationalState(integration, {
          observed: observedCalls,
          success: successCalls,
          degraded: degradedCalls,
          failed: failedCalls,
        }),
        windowHours: hours,
        totalCalls,
        successCalls,
        degradedCalls,
        failedCalls,
        disabledCalls,
        averageLatencyMs:
          latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
        lastActivityAt: lastActivity?.createdAt.toISOString() ?? null,
        lastSuccessAt: lastSuccess?.createdAt.toISOString() ?? null,
        lastFailureAt: lastFailure?.createdAt.toISOString() ?? null,
        lastAdverseAt: lastAdverse?.createdAt.toISOString() ?? null,
      };
    }),
  );
}
