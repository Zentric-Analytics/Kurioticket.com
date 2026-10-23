import "server-only";

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
  const where = {
    type: "FLIGHT" as const,
    createdAt: { gte: since, lte: now },
    query: { path: ["environment"], equals: environment },
  };

  try {
    const [total, successful, partial, failed, successfulZeroResults, latency, recentSearches] = await Promise.all([
      db.searchHistory.count({ where }),
      db.searchHistory.count({ where: { ...where, status: "SUCCESS" } }),
      db.searchHistory.count({ where: { ...where, status: "PARTIAL" } }),
      db.searchHistory.count({ where: { ...where, status: "FAILED" } }),
      db.searchHistory.count({ where: { ...where, status: "SUCCESS", resultCount: 0 } }),
      db.searchHistory.aggregate({ where, _avg: { latencyMs: true } }),
      db.searchHistory.findMany({
        where,
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
      recentSearches: recentSearches.map((search) => ({
        ...search,
        createdAt: search.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("[admin:flight-operations]", error);
    return null;
  }
}
