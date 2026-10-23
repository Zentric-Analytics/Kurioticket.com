import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export type HotelOperationsSnapshot = {
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
    degradedCalls: number;
    failedCalls: number;
    disabledCalls: number;
    averageLatencyMs: number | null;
    lastIssueAt: string | null;
    lastFailureAt: string | null;
  }>;
  recentSearches: Array<{
    id: string;
    requestId: string | null;
    destination: string | null;
    checkIn: string | null;
    checkOut: string | null;
    resultCount: number;
    latencyMs: number | null;
    status: string;
    createdAt: string;
  }>;
};

export async function getHotelOperationsSnapshot(
  windowHours = 24,
  environment: PublicEnvironment = getPublicEnvironment(),
): Promise<HotelOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const hours = Number.isInteger(windowHours) && windowHours >= 1 && windowHours <= 168 ? windowHours : 24;
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const searchWhere: Prisma.SearchHistoryWhereInput = {
    type: "HOTEL",
    createdAt: { gte: since, lte: now },
    query: { path: ["environment"], equals: environment },
  };
  const hotelProviders = getProviderIntegrationStatuses().filter((provider) => provider.products.includes("HOTELS"));

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
            destination: true,
            checkIn: true,
            checkOut: true,
            resultCount: true,
            latencyMs: true,
            status: true,
            createdAt: true,
          },
        }),
        Promise.all(hotelProviders.map(async (integration) => {
          const providerWhere: Prisma.ApiProviderLogWhereInput = {
            provider: integration.provider,
            service: "hotel-search",
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          };
          const [totalCalls, degradedCalls, failedCalls, disabledCalls, providerLatency, lastIssue, lastFailure] = await Promise.all([
            tx.apiProviderLog.count({ where: providerWhere }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DEGRADED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "FAILED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DISABLED" } }),
            tx.apiProviderLog.aggregate({ where: providerWhere, _avg: { latencyMs: true } }),
            tx.apiProviderLog.findFirst({
              where: { ...providerWhere, status: { in: ["FAILED", "DEGRADED", "DISABLED"] } },
              select: { createdAt: true },
              orderBy: { createdAt: "desc" },
            }),
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
            degradedCalls,
            failedCalls,
            disabledCalls,
            averageLatencyMs: providerLatency._avg.latencyMs === null ? null : Math.round(providerLatency._avg.latencyMs),
            lastIssueAt: lastIssue?.createdAt.toISOString() ?? null,
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
          checkIn: search.checkIn?.toISOString() ?? null,
          checkOut: search.checkOut?.toISOString() ?? null,
          createdAt: search.createdAt.toISOString(),
        })),
      };
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    console.error("[admin:hotel-operations]", error);
    return null;
  }
}
