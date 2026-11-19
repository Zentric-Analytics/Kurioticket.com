import { getPrisma } from "@/lib/prisma";

export const CACHE_MAINTENANCE_SERVICE = "srv-dabmo50jo6nc73881d60";
export const CACHE_MAINTENANCE_INTERVAL_MS = 30_000;

// Each invocation is a single small transaction. No JSON payload is loaded.
export async function deleteExpiredCacheBatch(now = new Date(), db = getPrisma()) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL statement_timeout = '1500ms'`;
    await tx.$executeRaw`SET LOCAL lock_timeout = '200ms'`;
    const locks = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(6213, 1) AS acquired
    `;
    if (!locks[0]?.acquired) return { flights: 0, providers: 0, skipped: true };
    const flights = await tx.$executeRaw`
      DELETE FROM "FlightResultCache" WHERE "publicResultId" IN (
        SELECT "publicResultId" FROM "FlightResultCache"
        WHERE "expiresAt" <= ${now} ORDER BY "expiresAt" ASC
        LIMIT 200 FOR UPDATE SKIP LOCKED
      ) AND "expiresAt" <= ${now}
    `;
    const providers = await tx.$executeRaw`
      DELETE FROM "ProviderResultCache" WHERE "cacheKey" IN (
        SELECT "cacheKey" FROM "ProviderResultCache"
        WHERE "expiresAt" <= ${now} ORDER BY "expiresAt" ASC
        LIMIT 200 FOR UPDATE SKIP LOCKED
      ) AND "expiresAt" <= ${now}
    `;
    return { flights, providers, skipped: false };
  }, { maxWait: 500, timeout: 4000 });
}

export function startCacheMaintenance(
  serviceId: string | undefined,
  batch = deleteExpiredCacheBatch,
  schedule = (task: () => void) => setTimeout(task, CACHE_MAINTENANCE_INTERVAL_MS),
) {
  if (serviceId !== CACHE_MAINTENANCE_SERVICE) return () => {};
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const queue = () => {
    if (stopped) return;
    timer = schedule(() => { void tick(); });
    timer.unref?.();
  };
  const tick = async () => {
    if (stopped) return;
    try {
      const result = await batch();
      console.info("[cache-maintenance]", result);
    } catch {
      // Never log SQL parameters, connection strings or provider payloads.
      console.warn("[cache-maintenance]", { outcome: "deferred" });
    } finally {
      queue();
    }
  };
  queue();
  return () => { stopped = true; clearTimeout(timer); };
}
