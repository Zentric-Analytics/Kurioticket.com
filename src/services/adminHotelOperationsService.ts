import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { classifyProviderIssue } from "@/services/searchFailureDiagnostics";
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
    attemptedCalls: number;
    degradedCalls: number;
    failedCalls: number;
    disabledCalls: number;
    averageLatencyMs: number | null;
    lastIssueAt: string | null;
    lastFailureAt: string | null;
  }>;
  exceptionSearches: Array<{
    id: string;
    requestId: string | null;
    destination: string | null;
    checkIn: string | null;
    checkOut: string | null;
    resultCount: number;
    latencyMs: number | null;
    status: string;
    kind: "FAILED" | "PARTIAL" | "ZERO_RESULTS";
    createdAt: string;
  }>;
  destinationIssues: Array<{
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
  const exceptionWhere: Prisma.SearchHistoryWhereInput = {
    ...searchWhere,
    OR: [
      { status: { in: ["FAILED", "PARTIAL"] } },
      { status: "SUCCESS", resultCount: 0 },
    ],
  };
  const hotelProviders = getProviderIntegrationStatuses().filter((provider) => provider.products.includes("HOTELS"));
  const hotelProviderNames = hotelProviders.map((provider) => provider.provider);

  try {
    return await db.$transaction(async (tx) => {
      const [
        total,
        successful,
        partial,
        failed,
        successfulZeroResults,
        latency,
        recentSearches,
        exceptionSearches,
        destinationIssues,
        providerIssues,
        providerHealth,
      ] = await Promise.all([
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
        tx.searchHistory.findMany({
          where: exceptionWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 12,
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
        tx.searchHistory.groupBy({
          by: ["destination"],
          where: exceptionWhere,
          _count: { _all: true },
          _max: { createdAt: true },
          orderBy: { _count: { id: "desc" } },
          take: 8,
        }),
        tx.apiProviderLog.findMany({
          where: {
            provider: { in: hotelProviderNames },
            service: "hotel-search",
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
        Promise.all(hotelProviders.map(async (integration) => {
          const providerWhere: Prisma.ApiProviderLogWhereInput = {
            provider: integration.provider,
            service: "hotel-search",
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          };
          const attemptedWhere: Prisma.ApiProviderLogWhereInput = {
            ...providerWhere,
            status: { in: ["SUCCESS", "DEGRADED", "FAILED"] },
          };
          const [attemptedCalls, degradedCalls, failedCalls, disabledCalls, providerLatency, lastIssue, lastFailure] = await Promise.all([
            tx.apiProviderLog.count({ where: attemptedWhere }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DEGRADED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "FAILED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DISABLED" } }),
            tx.apiProviderLog.aggregate({ where: attemptedWhere, _avg: { latencyMs: true } }),
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
            attemptedCalls,
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
        exceptionSearches: exceptionSearches.map((search) => ({
          ...search,
          kind: search.status === "FAILED" ? "FAILED" : search.status === "PARTIAL" ? "PARTIAL" : "ZERO_RESULTS",
          checkIn: search.checkIn?.toISOString() ?? null,
          checkOut: search.checkOut?.toISOString() ?? null,
          createdAt: search.createdAt.toISOString(),
        })),
        destinationIssues: destinationIssues.map((destination) => ({
          destination: destination.destination,
          issueCount: destination._count._all,
          lastIssueAt: destination._max.createdAt?.toISOString() ?? null,
        })),
        providerIssues: providerIssues.map((issue) => ({
          id: issue.id,
          provider: issue.provider,
          status: issue.status,
          category: hotelProviderIssueCategory(issue.status, issue.errorMessage),
          latencyMs: issue.latencyMs,
          createdAt: issue.createdAt.toISOString(),
        })),
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


function hotelProviderIssueCategory(status: string, message: string | null) {
  if (status === "DISABLED" && !message) return "Provider disabled / skipped";
  return classifyProviderIssue(message).label;
}

export const __adminHotelOperationsTest = { hotelProviderIssueCategory };
