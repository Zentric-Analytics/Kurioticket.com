import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";

export type CarOperationsSnapshot = {
  environment: PublicEnvironment;
  windowHours: number;
  searches: {
    total: number;
    successful: number;
    failed: number;
    averageLatencyMs: number | null;
  };
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

  try {
    return await db.$transaction(async (tx) => {
      const [total, successful, failed, latency, recentSearches] = await Promise.all([
        tx.searchHistory.count({ where: searchWhere }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "SUCCESS" } }),
        tx.searchHistory.count({ where: { ...searchWhere, status: "FAILED" } }),
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
      ]);

      return {
        environment,
        windowHours: hours,
        searches: {
          total,
          successful,
          failed,
          averageLatencyMs: latency._avg.latencyMs === null ? null : Math.round(latency._avg.latencyMs),
        },
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
