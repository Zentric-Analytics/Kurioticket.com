import { getOptionalPrisma } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";

export const observedJobs = ["price-alerts", "travel-inspiration", "homepage-fares", "account-deletion-review"] as const;
type Job = typeof observedJobs[number];
type Outcome = "RUNNING" | "SUCCESS" | "DEGRADED" | "FAILED" | "DISABLED";
type Store = { begin: (job: Job) => Promise<string | null>; finish: (id: string, job: Job, state: Outcome, latencyMs: number) => Promise<unknown> };
/** Optional monitoring records one existing provider-log row per invocation,
 * updates that row on completion, and never stores task payloads or exceptions. */
export function createScheduledJobObserver(store: Store, now = Date.now) {
  return async function observe<T>(job: Job, task: () => Promise<T>): Promise<T> {
    const started = now();
    const id = await store.begin(job).catch(() => null);
    let state: Outcome = "FAILED";
    try {
      const result = await task();
      const outcome = result && typeof result === "object" ? result as { disabled?: boolean; failed?: number } : {};
      state = outcome.disabled === true ? "DISABLED" : typeof outcome.failed === "number" && outcome.failed > 0 ? "DEGRADED" : "SUCCESS";
      return result;
    } finally {
      if (id) await store.finish(id, job, state, Math.max(0, now() - started)).catch(() => {
        console.warn("[scheduled-job:observation-unavailable]", { job });
      });
    }
  };
}
export const observeScheduledJob = createScheduledJobObserver({
  begin: async job => {
    const db = getOptionalPrisma();
    if (!db) return null;
    const row = await db.apiProviderLog.create({ data: { provider: job, service: "scheduled-job", status: "DEGRADED", metadata: withEnvironmentMetadata({ state: "RUNNING" }) }, select: { id: true } });
    return row.id;
  },
  finish: async (id, job, state, latencyMs) => getOptionalPrisma()?.apiProviderLog.update({ where: { id }, data: {
    status: state === "RUNNING" ? "DEGRADED" : state, latencyMs: Math.min(2_147_483_647, latencyMs), metadata: withEnvironmentMetadata({ job, state, completedAt: new Date().toISOString() }),
  } }),
});
