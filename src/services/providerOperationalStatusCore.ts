import { Prisma } from "@/generated/prisma/client";
import type { PublicEnvironment } from "@/lib/stagingSafety";
import { classifyProviderIssue, type SafeProviderIssue } from "@/services/searchFailureDiagnostics";

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

export type ProviderOperationalIssue = {
  code: SafeProviderIssue["code"];
  label: string;
  calls: number;
};

export type ProviderOperationalServiceStatus = {
  service: string;
  operationalState: ProviderOperationalState;
  totalCalls: number;
  attemptedCalls: number;
  successCalls: number;
  degradedCalls: number;
  failedCalls: number;
  disabledCalls: number;
  failureRatePct: number | null;
  failureReasons: ProviderOperationalIssue[];
};

export type ProviderOperationalStatus = {
  id: ProviderOperationalReadiness["id"];
  provider: string;
  readinessState: ProviderOperationalReadiness["state"];
  operationalState: ProviderOperationalState;
  windowHours: number;
  totalCalls: number;
  attemptedCalls: number;
  successCalls: number;
  degradedCalls: number;
  failedCalls: number;
  disabledCalls: number;
  failureRatePct: number | null;
  serviceBreakdown: ProviderOperationalServiceStatus[];
  averageLatencyMs: number | null;
  lastActivityAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastAdverseAt: string | null;
};

export type ProviderOperationalDatabase = Pick<Prisma.TransactionClient, "apiProviderLog">;

type CallCounts = {
  success: number;
  degraded: number;
  failed: number;
  disabled: number;
};

type GroupRow = {
  service: string;
  status: string;
  errorMessage: string | null;
  _count: { _all: number };
};

const providerNames: Record<ProviderOperationalReadiness["id"], string> = {
  duffel: "Duffel",
  "kayak-sandbox": "KAYAK sandbox",
};

const expectedServices: Record<ProviderOperationalReadiness["id"], readonly string[]> = {
  duffel: ["flight-search"],
  "kayak-sandbox": ["flight-search", "hotel-search", "car-search"],
};

const blankCounts = (): CallCounts => ({ success: 0, degraded: 0, failed: 0, disabled: 0 });
const attempted = (counts: CallCounts) => counts.success + counts.degraded + counts.failed;

function validCount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid provider telemetry count.");
  return value;
}

/** Preserve tenths so a real failure does not appear as a misleading 0%. */
export function providerFailureRatePct(counts: CallCounts): number | null {
  const n = attempted(counts);
  return n === 0 ? null : Math.round(1000 * counts.failed / n) / 10;
}

/** Share the same honest percentage display across Overview and Providers. */
export function formatProviderFailureRatePct(rate: number | null, failedCalls: number): string {
  if (rate === null) return "No attempts";
  if (failedCalls > 0 && rate === 0) return "<0.1%";
  return rate.toFixed(1) + "%";
}

/**
 * No successful calls still means failing. With a sufficient sample, a failure
 * rate of 75% or more is also failing, even if a few calls succeeded.
 * Disabled calls are not attempted requests and are never in the denominator.
 */
export function classifyProviderOperationalState(
  readiness: ProviderOperationalReadiness["state"],
  counts: CallCounts,
): ProviderOperationalState {
  if (readiness !== "READY") return "NOT_READY";
  const n = attempted(counts);
  if (n === 0) return "NO_RECENT_ACTIVITY";
  if (counts.failed > 0 && (counts.success === 0 || (n >= 10 && counts.failed * 4 >= n * 3))) return "FAILING";
  if (counts.failed > 0 || counts.degraded > 0) return "DEGRADED";
  return "HEALTHY";
}

export function summarizeProviderServices(
  readiness: ProviderOperationalReadiness,
  groups: readonly GroupRow[],
): ProviderOperationalServiceStatus[] {
  const byService = new Map<string, { counts: CallCounts; reasons: Map<string, ProviderOperationalIssue> }>();
  for (const service of expectedServices[readiness.id]) {
    byService.set(service, { counts: blankCounts(), reasons: new Map() });
  }

  for (const row of groups) {
    const amount = validCount(row._count._all);
    const entry = byService.get(row.service) ?? { counts: blankCounts(), reasons: new Map<string, ProviderOperationalIssue>() };
    if (row.status === "SUCCESS") entry.counts.success += amount;
    else if (row.status === "DEGRADED") entry.counts.degraded += amount;
    else if (row.status === "FAILED") entry.counts.failed += amount;
    else if (row.status === "DISABLED") entry.counts.disabled += amount;
    else throw new Error("Unknown provider telemetry status.");

    // Raw provider errors are never returned to the admin UI or API.
    if (row.status === "FAILED" && amount > 0) {
      const classified = classifyProviderIssue(row.errorMessage);
      const old = entry.reasons.get(classified.code);
      entry.reasons.set(classified.code, {
        code: classified.code, label: classified.label, calls: (old?.calls ?? 0) + amount,
      });
    }
    byService.set(row.service, entry);
  }

  return [...byService.entries()].map(([service, item]) => {
    const counts = item.counts;
    const totalCalls = counts.success + counts.degraded + counts.failed + counts.disabled;
    validCount(totalCalls);
    return {
      service,
      operationalState: classifyProviderOperationalState(readiness.state, counts),
      totalCalls,
      attemptedCalls: validCount(attempted(counts)),
      successCalls: counts.success,
      degradedCalls: counts.degraded,
      failedCalls: counts.failed,
      disabledCalls: counts.disabled,
      failureRatePct: providerFailureRatePct(counts),
      failureReasons: [...item.reasons.values()].sort((a, b) => b.calls - a.calls || a.code.localeCompare(b.code)),
    };
  });
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

  return Promise.all(input.readiness.map(async integration => {
    const provider = providerNames[integration.id];
    const where: Prisma.ApiProviderLogWhereInput = {
      provider,
      createdAt: { gte: since, lte: input.now },
      metadata: { path: ["environment"], equals: input.environment },
    };
    const attemptedWhere: Prisma.ApiProviderLogWhereInput = {
      ...where,
      status: { in: ["SUCCESS", "DEGRADED", "FAILED"] },
    };

    const [
      totalCalls,
      successCalls,
      degradedCalls,
      failedCalls,
      disabledCalls,
      grouped,
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
      input.database.apiProviderLog.groupBy({
        by: ["service", "status", "errorMessage"],
        where,
        _count: { _all: true },
      }),
      // DISABLED calls never reached a provider; they must not dilute latency.
      input.database.apiProviderLog.aggregate({ where: attemptedWhere, _avg: { latencyMs: true } }),
      input.database.apiProviderLog.findFirst({
        where, select: { createdAt: true }, orderBy: { createdAt: "desc" },
      }),
      input.database.apiProviderLog.findFirst({
        where: { ...where, status: "SUCCESS" },
        select: { createdAt: true }, orderBy: { createdAt: "desc" },
      }),
      input.database.apiProviderLog.findFirst({
        where: { ...where, status: "FAILED" },
        select: { createdAt: true }, orderBy: { createdAt: "desc" },
      }),
      input.database.apiProviderLog.findFirst({
        where: { ...where, status: { in: ["FAILED", "DEGRADED"] } },
        select: { createdAt: true }, orderBy: { createdAt: "desc" },
      }),
    ]);

    const counts: CallCounts = {
      success: validCount(successCalls),
      degraded: validCount(degradedCalls),
      failed: validCount(failedCalls),
      disabled: validCount(disabledCalls),
    };
    const services = summarizeProviderServices(integration, grouped);
    const countedByStatus = attempted(counts) + counts.disabled;
    const countedByService = services.reduce((sum, row) => sum + row.totalCalls, 0);
    if (
      validCount(totalCalls) !== countedByStatus ||
      countedByService !== totalCalls ||
      services.reduce((sum, row) => sum + row.successCalls, 0) !== successCalls ||
      services.reduce((sum, row) => sum + row.degradedCalls, 0) !== degradedCalls ||
      services.reduce((sum, row) => sum + row.failedCalls, 0) !== failedCalls ||
      services.reduce((sum, row) => sum + row.disabledCalls, 0) !== disabledCalls
    ) throw new Error("Provider telemetry aggregates do not reconcile.");

    return {
      id: integration.id,
      provider,
      readinessState: integration.state,
      operationalState: classifyProviderOperationalState(integration.state, counts),
      windowHours: hours,
      totalCalls,
      attemptedCalls: validCount(attempted(counts)),
      successCalls,
      degradedCalls,
      failedCalls,
      disabledCalls,
      failureRatePct: providerFailureRatePct(counts),
      serviceBreakdown: services,
      averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
      lastActivityAt: lastActivity?.createdAt.toISOString() ?? null,
      lastSuccessAt: lastSuccess?.createdAt.toISOString() ?? null,
      lastFailureAt: lastFailure?.createdAt.toISOString() ?? null,
      lastAdverseAt: lastAdverse?.createdAt.toISOString() ?? null,
    };
  }));
}
