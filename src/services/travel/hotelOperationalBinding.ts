import type { PrismaClient } from "@/generated/prisma/client";
import type { OperationalSessionReference } from "@/lib/operationalSearchSession";
import { getOptionalPrisma } from "@/lib/prisma";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const snapshotUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ttlMs = 30 * 60_000;
// Deliberately outside the public hotel/car cache key spaces. Ordinary details
// lookups cannot retrieve this row as inventory. Existing expiry cleanup covers it.
const vertical = "hotel-operational-binding-v1";
function bindingKey(snapshot: string) { return vertical + ":staging:" + snapshot; }

/** Only server-generated KAYAK snapshot IDs, never criteria or supplier row IDs. */
export function kayakHotelSnapshot(result: { id: string; provider: string }): string | undefined {
  if (result.provider !== "KAYAK sandbox" || typeof result.id !== "string" || result.id.length > 4096) return undefined;
  const match = /^kayak-sandbox:([^:]+):[^\s]+$/.exec(result.id);
  return match && snapshotUuid.test(match[1]) ? match[1] : undefined;
}

export function returnedKayakHotelSnapshot(results: ReadonlyArray<{ id: string; provider: string }>): string | undefined {
  const snapshots = new Set<string>();
  for (const result of results) {
    if (result.provider !== "KAYAK sandbox") continue;
    const id = kayakHotelSnapshot(result);
    if (!id) return undefined; // ambiguous/malformed provider inventory
    snapshots.add(id);
  }
  return snapshots.size === 1 ? snapshots.values().next().value : undefined;
}

type Database = Pick<PrismaClient, "$transaction">;
export function createHotelOperationalBindingStore(getDatabase: () => Database | null, now = Date.now) {
  function eligible(snapshot: string, session: OperationalSessionReference | null | undefined, at: number): session is OperationalSessionReference {
    return Boolean(snapshotUuid.test(snapshot) && session && session.environment === "staging" &&
      snapshotUuid.test(session.id) && Number.isFinite(session.expiresAt.getTime()) && session.expiresAt.getTime() > at);
  }
  async function remember(snapshot: string, requestId: string, session: OperationalSessionReference | null | undefined, userId: string | null): Promise<boolean> {
    const at = now();
    if (!eligible(snapshot, session, at) || !uuid.test(requestId)) return false;
    try {
      const db = getDatabase();
      if (!db) return false;
      const expiresAt = new Date(Math.min(at + ttlMs, session.expiresAt.getTime()));
      // One bounded, immutable row per snapshot. Keep only the existing verified
      // account reference (null for a guest); no credentials, visitor identity,
      // criteria or offer list. Never renew the original expiry.
      const inserted = await db.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '750ms'`;
        if (now() >= expiresAt.getTime()) return { count: 0 };
        return tx.providerResultCache.createMany({ data: [{
          cacheKey: bindingKey(snapshot), vertical, resultId: "staging:" + snapshot,
          normalizedResult: { requestId, operationalSessionId: session.id, userId },
          expiresAt,
        }], skipDuplicates: true });
      }, { maxWait: 500, timeout: 1000 });
      return inserted.count === 1;
    } catch {
      // Cache unavailability must not block valid search inventory.
      return false;
    }
  }
  async function resolve(snapshot: string, session: OperationalSessionReference | null | undefined, userId: string | null): Promise<string | undefined> {
    if (!eligible(snapshot, session, now())) return undefined;
    try {
      const db = getDatabase();
      if (!db) return undefined;
      const row = await db.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '750ms'`;
        return tx.providerResultCache.findUnique({ where: { cacheKey: bindingKey(snapshot) } });
      }, { maxWait: 500, timeout: 1000 });
      const at = now();
      if (!eligible(snapshot, session, at) || !row || row.vertical !== vertical ||
          row.resultId !== "staging:" + snapshot || row.expiresAt.getTime() <= at) return undefined;
      const value = row.normalizedResult;
      if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
      return value.operationalSessionId === session.id && value.userId === userId && typeof value.requestId === "string" && uuid.test(value.requestId)
        ? value.requestId : undefined;
    } catch {
      return undefined;
    }
  }
  return { remember, resolve };
}
const bindingStore = createHotelOperationalBindingStore(getOptionalPrisma);
export const rememberHotelOperationalBinding = bindingStore.remember;
export const resolveHotelOperationalBinding = bindingStore.resolve;
