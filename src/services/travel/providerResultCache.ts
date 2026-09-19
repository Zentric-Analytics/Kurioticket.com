import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type ProviderDetailsVertical = "hotel" | "car";
const TTL_MS = 30 * 60 * 1000;

const cacheKey = (vertical: ProviderDetailsVertical, resultId: string) =>
  `${vertical}:${resultId}`;

export async function rememberProviderResults<T extends { id: string }>(
  vertical: ProviderDetailsVertical,
  results: T[],
  searchContext: unknown,
  now = Date.now(),
) {
  if (!results.length) return;
  const expiresAt = new Date(now + TTL_MS);
  try {
    await Promise.all(results.map((result) => getPrisma().providerResultCache.upsert({
    where: { cacheKey: cacheKey(vertical, result.id) },
    create: {
      cacheKey: cacheKey(vertical, result.id),
      vertical,
      resultId: result.id,
      normalizedResult: result as never,
      searchContext: searchContext as never,
      expiresAt,
    },
    update: {
      normalizedResult: result as never,
      searchContext: searchContext as never,
      expiresAt,
    },
    })));
  } catch {
    console.error("[provider-result-cache]", { event: "write_error", vertical });
  }
}

export async function getProviderResult<T>(
  vertical: ProviderDetailsVertical,
  resultId: string,
  now = Date.now(),
): Promise<T | null> {
  try {
    const row = await getPrisma().providerResultCache.findUnique({
      where: { cacheKey: cacheKey(vertical, resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now) return null;
    return structuredClone(row.normalizedResult) as T;
  } catch {
    console.error("[provider-result-cache]", { event: "read_error", vertical });
    return null;
  }
}

export async function getProviderResultContext<T>(
  vertical: ProviderDetailsVertical,
  resultId: string,
  now = Date.now(),
): Promise<{
  result: T;
  searchContext: unknown;
  relatedResults: T[];
} | null> {
  try {
    const db = getPrisma();
    const row = await db.providerResultCache.findUnique({
      where: { cacheKey: cacheKey(vertical, resultId) },
    });
    if (!row || row.expiresAt.getTime() <= now) return null;

    const searchContext = row.searchContext;
    if (!searchContext) {
      return {
        result: structuredClone(row.normalizedResult) as T,
        searchContext: null,
        relatedResults: [],
      };
    }

    const peers = await db.providerResultCache.findMany({
      where: {
        vertical,
        expiresAt: { gt: new Date(now) },
        searchContext: {
          equals: searchContext as Prisma.InputJsonValue,
        },
      },
    });

    return {
      result: structuredClone(row.normalizedResult) as T,
      searchContext: structuredClone(searchContext),
      relatedResults: peers
        .filter((peer) => peer.resultId !== resultId)
        .map((peer) => structuredClone(peer.normalizedResult) as T),
    };
  } catch {
    console.error("[provider-result-cache]", { event: "context_read_error", vertical });
    return null;
  }
}
