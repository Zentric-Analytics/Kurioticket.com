import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { classifyProviderIssue } from "@/services/searchFailureDiagnostics";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export type CarOperationsSnapshot = {
  environment: PublicEnvironment;
  windowHours: number;
  searches: {
    total: number;
    successful: number;
    partial: number;
    failed: number;
    successfulZeroResults: number;
    averageLatencyMs: number | null;
  };
  providerHealth: Array<{
    id: "duffel" | "kayak-sandbox";
    provider: string;
    attemptedCalls: number;
    failedCalls: number;
    disabledCalls: number;
    averageLatencyMs: number | null;
    lastIssueAt: string | null;
  }>;
  exceptionSearches: Array<{
    id: string;
    requestId: string | null;
    origin: string | null;
    destination: string | null;
    resultCount: number;
    latencyMs: number | null;
    status: string;
    kind: "FAILED" | "PARTIAL" | "ZERO_RESULTS";
    createdAt: string;
  }>;
  locationIssues: Array<{
    origin: string | null;
    destination: string | null;
    issueCount: number;
    lastIssueAt: string | null;
  }>;
  providerIssues: Array<{
    id: string;
    provider: string;
    status: string;
    category: string;
    latencyMs: number | null;
    createdAt: string;
  }>;
  recentSearches: Array<{
    id: string;
    requestId: string | null;
    origin: string | null;
    destination: string | null;
    resultCount: number;
    latencyMs: number | null;
    status: string;
    createdAt: string;
  }>;
};

export async function getCarOperationsSnapshot(
  windowHours = 24,
  environment: PublicEnvironment = getPublicEnvironment(),
): Promise<CarOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const hours = Number.isInteger(windowHours) && windowHours >= 1 && windowHours <= 168 ? windowHours : 24;
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const searchWhere: Prisma.SearchHistoryWhereInput = {
    type: "CAR",
    createdAt: { gte: since, lte: now },
    query: { path: ["environment"], equals: environment },
  };
  const exceptionWhere: Prisma.SearchHistoryWhereInput = {
    ...searchWhere,
    OR: [
      { status: { in: ["FAILED", "PARTIAL"] } },
      { status: "SUCCESS", resultCount: 0 },
    ],
  };
  const carProviders = getProviderIntegrationStatuses().filter((provider) => provider.products.includes("CARS"));
  const carProviderNames = carProviders.map((provider) => provider.provider);

  try {
    return await db.$transaction(async (tx) => {
      const [total, successful, partial, failed, successfulZeroResults, latency, recentSearches, exceptionSearches, locationIssues, providerIssues, providerHealth] = await Promise.all([
        tx.searchHistory.count({ where: searchWhere }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "SUCCESS" } }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "PARTIAL" } }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "FAILED" } }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "SUCCESS", resultCount: 0 } }),
        tx.searchHistory.aggregate({ where: searchWhere, _avg: { latencyMs: true } }),
        tx.searchHistory.findMany({
          where: searchWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 10,
          select: {
            id: true,
            requestId: true,
            origin: true,
            destination: true,
            resultCount: true,
            latencyMs: true,
            status: true,
            createdAt: true,
          },
        }),
        tx.searchHistory.findMany({
          where: exceptionWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 12,
          select: {
            id: true,
            requestId: true,
            origin: true,
            destination: true,
            resultCount: true,
            latencyMs: true,
            status: true,
            createdAt: true,
          },
        }),
        tx.searchHistory.groupBy({
          by: ["origin", "destination"],
          where: exceptionWhere,
          _count: { _all: true },
          _max: { createdAt: true },
          orderBy: { _count: { id: "desc" } },
          take: 8,
        }),
        tx.apiProviderLog.findMany({
          where: {
            provider: { in: carProviderNames },
            service: "car-search",
            status: { in: ["FAILED", "DEGRADED", "DISABLED"] },
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 12,
          select: {
            id: true,
            provider: true,
            status: true,
            latencyMs: true,
            errorMessage: true,
            createdAt: true,
          },
        }),
        Promise.all(carProviders.map(async (integration) => {
          const providerWhere: Prisma.ApiProviderLogWhereInput = {
            provider: integration.provider,
            service: "car-search",
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          };
          const attemptedWhere: Prisma.ApiProviderLogWhereInput = {
            ...providerWhere,
            status: { in: ["SUCCESS", "DEGRADED", "FAILED"] },
          };
          const [attemptedCalls, failedCalls, disabledCalls, latency, lastIssue] = await Promise.all([
            tx.apiProviderLog.count({ where: attemptedWhere }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "FAILED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DISABLED" } }),
            tx.apiProviderLog.aggregate({ where: attemptedWhere, _avg: { latencyMs: true } }),
            tx.apiProviderLog.findFirst({
              where: { ...providerWhere, status: { in: ["FAILED", "DEGRADED", "DISABLED"] } },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              select: { createdAt: true },
            }),
          ]);
          return {
            id: integration.id,
            provider: integration.provider,
            attemptedCalls,
            failedCalls,
            disabledCalls,
            averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
            lastIssueAt: lastIssue?.createdAt.toISOString() ?? null,
          };
        })),
      ]);

      return {
        environment,
        windowHours: hours,
        searches: {
          total,
          successful,
          partial,
          failed,
          successfulZeroResults,
          averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
        },
        providerHealth,
        exceptionSearches: exceptionSearches.map((search) => ({
          ...search,
          kind: search.status === "FAILED" ? "FAILED" : search.status === "PARTIAL" ? "PARTIAL" : "ZERO_RESULTS",
          createdAt: search.createdAt.toISOString(),
        })),
        locationIssues: locationIssues.map((location) => ({
          origin: location.origin,
          destination: location.destination,
          issueCount: location._count._all,
          lastIssueAt: location._max.createdAt?.toISOString() ?? null,
        })),
        providerIssues: providerIssues.map((issue) => ({
          id: issue.id,
          provider: issue.provider,
          status: issue.status,
          category: carProviderIssueCategory(issue.status, issue.errorMessage),
          latencyMs: issue.latencyMs,
          createdAt: issue.createdAt.toISOString(),
        })),
        recentSearches: recentSearches.map((search) => ({
          ...search,
          createdAt: search.createdAt.toISOString(),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    console.error("[admin:car-operations]", error);
    return null;
  }
}


function carProviderIssueCategory(status: string, message: string | null) {
  if (status === "DISABLED") {
    return message ? "Unsupported search / provider coverage" : "Provider disabled / skipped";
  }
  return classifyProviderIssue(message).label;
}

export const __adminCarOperationsTest = { carProviderIssueCategory };
