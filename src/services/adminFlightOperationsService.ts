import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";

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

