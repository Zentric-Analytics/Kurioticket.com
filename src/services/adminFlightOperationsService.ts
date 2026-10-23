import "server-only";

import type { Prisma } from "@/generated/prisma/client";
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
    degradedCalls: number;
    failedCalls: number;
    averageLatencyMs: number | null;
    lastIssueAt: string | null;
    lastFailureAt: string | null;
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
  routeIssues: Array<{
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

export async function getFlightOperationsSnapshot(
  windowHours = 24,
  environment: PublicEnvironment = getPublicEnvironment(),
): Promise<FlightOperationsSnapshot | null> {
  const db = getOptionalPrisma();
  if (!db) return null;

  const hours = Number.isInteger(windowHours) && windowHours >= 1 && windowHours <= 168 ? windowHours : 24;
  const now = new Date();
  const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const searchWhere: Prisma.SearchHistoryWhereInput = {
    type: "FLIGHT",
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
  const flightProviders = getProviderIntegrationStatuses().filter((provider) => provider.products.includes("FLIGHTS"));
  const flightProviderNames = flightProviders.map((provider) => provider.provider);

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
        routeIssues,
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
            provider: { in: flightProviderNames },
            service: "flight-search",
            status: { in: ["FAILED", "DEGRADED"] },
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 10,
          select: {
            id: true,
            provider: true,
            status: true,
            latencyMs: true,
            errorMessage: true,
            createdAt: true,
          },
        }),
        Promise.all(flightProviders.map(async (integration) => {
          const providerWhere: Prisma.ApiProviderLogWhereInput = {
            provider: integration.provider,
            service: "flight-search",
            createdAt: { gte: since, lte: now },
            metadata: { path: ["environment"], equals: environment },
          };
          const [totalCalls, degradedCalls, failedCalls, providerLatency, lastIssue, lastFailure] = await Promise.all([
            tx.apiProviderLog.count({ where: providerWhere }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "DEGRADED" } }),
            tx.apiProviderLog.count({ where: { ...providerWhere, status: "FAILED" } }),
            tx.apiProviderLog.aggregate({ where: providerWhere, _avg: { latencyMs: true } }),
            tx.apiProviderLog.findFirst({
              where: { ...providerWhere, status: { in: ["FAILED", "DEGRADED"] } },
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
          createdAt: search.createdAt.toISOString(),
        })),
        routeIssues: routeIssues.map((route) => ({
          origin: route.origin,
          destination: route.destination,
          issueCount: route._count._all,
          lastIssueAt: route._max.createdAt?.toISOString() ?? null,
        })),
        providerIssues: providerIssues.map((issue) => ({
          id: issue.id,
          provider: issue.provider,
          status: issue.status,
          category: providerIssueCategory(issue.errorMessage),
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
    console.error("[admin:flight-operations]", error);
    return null;
  }
}

function providerIssueCategory(message: string | null) {
  if (!message) return "Provider issue";
  const normalized = message.toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("timed out") || normalized.includes("abort")) return "Timeout";
  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("too many")) return "Rate limited";
  if (
    normalized.includes("401")
    || normalized.includes("403")
    || normalized.includes("unauthor")
    || normalized.includes("forbidden")
    || normalized.includes("credential")
    || normalized.includes("api key")
  ) return "Authentication / configuration";
  if (
    normalized.includes("500")
    || normalized.includes("502")
    || normalized.includes("503")
    || normalized.includes("504")
    || normalized.includes("unavailable")
    || normalized.includes("upstream")
  ) return "Upstream unavailable";
  return "Provider error";
}

export const __adminFlightOperationsTest = { providerIssueCategory };
