import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export type FlightOperationsSnapshot = {
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
    totalCalls: number;
    failedCalls: number;
    averageLatencyMs: number | null;
    lastFailureAt: string | null;
  }>;
  recentSearches: Array<{
    id: string;
    requestId: string | null;
    origin: string | null;
    destination: string | null;
    resultCount: number;
    latencyMs: number;
    status: string;
    createdAt: string;
  }>;
};

export async function getFlightOperationsSnapshot(
  windowHours = 24,
  environment: PublicEnvironment = getPublicEnvironment(),
): Promise<FlightOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const hours = Number.isInteger(windowHours) && windowHours >= 1 && windowHours <= 168 ? windowHours : 24;
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const searchWhere = {
    type: "FLIGHT" as const,
    createdAt: { gte: since, lte: now },
    query: { path: ["environment"], equals: environment },
  };
  const flightProviders = getProviderIntegrationStatuses().filter((provider) => provider.products.includes("FLIGHTS"));

  try {
    return await db.$transaction(async (tx) => {
      const [total, successful, partial, failed, successfulZeroResults, latency, recentSearches, providerHealth] = await Promise.all([
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
        Promise.all(flightProviders.map(async (integration) => {
          const providerWhere = {
            provider: integration.provider,
            service: "flight-search",
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          };
          const [totalCalls, failedCalls, providerLatency, lastFailure] = await Promise.all([
            tx.apiProviderLog.count({ where: providerWhere }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "FAILED" } }),
            tx.apiProviderLog.aggregate({ where: providerWhere, _avg: { latencyMs: true } }),
            tx.apiProviderLog.findFirst({
              where: { ...providerWhere, status: "FAILED" },
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
            }),
          ]);
          return {
            id: integration.id,
            provider: integration.provider,
            totalCalls,
            failedCalls,
            averageLatencyMs: providerLatency._avg.latencyMs === null ? null : Math.round(providerLatency._avg.latencyMs),
            lastFailureAt: lastFailure?.createdAt.toISOString() ?? null,
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
        recentSearches: recentSearches.map((search) => ({
          ...search,
          createdAt: search.createdAt.toISOString(),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    console.error("[admin:flight-operations]", error);
    return null;
  }
}
