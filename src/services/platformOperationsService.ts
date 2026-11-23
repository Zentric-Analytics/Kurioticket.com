import "server-only";
import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, getStagingReleaseReadiness } from "@/lib/stagingSafety";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getProviderOperationalStatuses } from "@/services/providerOperationalStatus";
import { getEmailDeliveryHealthSnapshot } from "@/services/emailDeliveryService";
import { getCmsHealthOverview } from "@/services/cmsHardeningService";
import { partitionOperationalGroups, projectScheduledJobRun, type ScheduledJobRun, type OperationalGroup } from "./platformOperationsContract";
import { getAdminAlertSnapshot } from "./adminAlertService";

/** Overview only needs search counts in the shared reporting window. */
export async function readPlatformSearchActivity(from: Date, to: Date) {
  const environment = getPublicEnvironment();
  const window = { from: from.toISOString(), to: to.toISOString() };
  let searches: ReturnType<typeof partitionOperationalGroups>["searches"] | null = null;
  let verifiedBotAttempts: number | null = null;
  try {
    const db = getOptionalPrisma();
    if (db) {
      const rows = await db.$queryRaw<OperationalGroup[]>`
        SELECT 'searches' AS kind, query->>'applicationSource' AS source,
          status::text, COUNT(*) AS count, 0 AS latency
        FROM "SearchHistory"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND query->>'environment' = ${environment}
        GROUP BY 1, 2, 3
        UNION ALL
        SELECT 'crawlerBlocks' AS kind, 'CRAWLER' AS source,
          'DISABLED' AS status, COUNT(*) AS count, 0 AS latency
        FROM "ApiProviderLog"
        WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND metadata->>'environment' = ${environment}
          AND service = 'crawler-blocked-search'
          AND metadata->>'applicationSource' = 'CRAWLER'
          AND status::text = 'DISABLED'
          AND provider IN ('GOOGLEBOT', 'BINGBOT')
      `;
      const verifiedRows = rows.filter(row => row.kind === "crawlerBlocks");
      if (verifiedRows.length !== 1) throw new Error("Verified crawler count unavailable");
      const total = Number(verifiedRows[0].count);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error("Invalid verified crawler count");
      searches = partitionOperationalGroups(rows).searches;
      verifiedBotAttempts = total;
    }
  } catch { /* Failed reads do not describe an empty window. */ }
  return { environment, window, searches, verifiedBotAttempts };
}

/** Aggregate-only operational read. No account IDs, device IDs, raw errors,
 * traveler queries or URLs are returned. Accounts/sessions are not event totals. */
export async function readPlatformOperations(hours = 24, period: "today" | "rolling" = "rolling") {
  const environment = getPublicEnvironment();
  const to = new Date();
  const from = period === "today"
    ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
    : new Date(to.getTime() - hours * 3_600_000);
  const db = getOptionalPrisma();
  let activity: ReturnType<typeof partitionOperationalGroups> | null = null;
  let crawlerBlocks: number | null = null;
  let jobs: ScheduledJobRun[] | null = null;
  if (db) try {
    const [rows, runs] = await db.$transaction(async tx => Promise.all([
      tx.$queryRaw<OperationalGroup[]>`
        SELECT 'searches' AS kind, query->>'applicationSource' AS source, status::text, COUNT(*) AS count, COALESCE(SUM("latencyMs"),0) AS latency, COUNT("latencyMs") AS "latencyCount"
        FROM "SearchHistory" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND query->>'environment' = ${environment} GROUP BY 1,2,3
        UNION ALL
        SELECT 'handoffs', metadata->>'applicationSource', 'SUCCESS', COUNT(*), 0, 0
        FROM "RedirectLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND metadata->>'environment' = ${environment} GROUP BY 1,2,3
        UNION ALL
        SELECT 'providerCalls', metadata->>'applicationSource', status::text, COUNT(*), COALESCE(SUM(CASE WHEN status::text <> 'DISABLED' THEN "latencyMs" ELSE 0 END),0), COUNT(CASE WHEN status::text <> 'DISABLED' THEN "latencyMs" END)
        FROM "ApiProviderLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND metadata->>'environment' = ${environment} AND service NOT IN ('scheduled-job','crawler-blocked-search') GROUP BY 1,2,3
        UNION ALL
        SELECT 'crawlerBlocks', 'CRAWLER', 'DISABLED', COUNT(*), 0, 0
        FROM "ApiProviderLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
          AND metadata->>'environment' = ${environment}
          AND service = 'crawler-blocked-search' AND metadata->>'applicationSource' = 'CRAWLER'
          AND status::text = 'DISABLED' AND provider IN ('GOOGLEBOT', 'BINGBOT')
      `,
      tx.apiProviderLog.findMany({ where: { service: "scheduled-job", metadata: { path: ["environment"], equals: environment }, createdAt: { gte: from, lt: to } }, select: { provider: true, status: true, createdAt: true, metadata: true, latencyMs: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]), { isolationLevel: "RepeatableRead" });
    activity = partitionOperationalGroups(rows);
    // Verified crawler API blocks are not customer searches or provider calls.
    // Keep them observable as a separate count with the same window.
    const count = rows.filter(row => row.kind === "crawlerBlocks").reduce((sum, row) => sum + Number(row.count), 0);
    crawlerBlocks = Number.isSafeInteger(count) && count >= 0 ? count : null;
    jobs = runs.map(run => projectScheduledJobRun(run, environment, to));
  } catch { /* Unavailable never becomes an empty/healthy aggregate. */ }
  const [system, providers, email, cms, alerts] = await Promise.all([
    getSafeSystemStatus().catch(() => null), getProviderOperationalStatuses(hours, environment, period === "today" ? { from, to } : undefined).catch(() => null),
    getEmailDeliveryHealthSnapshot().catch(() => null), getCmsHealthOverview().catch(() => null), getAdminAlertSnapshot().catch(() => null),
  ]);
  return {
    environment, window: { from: from.toISOString(), to: to.toISOString() },
    activity: { state: activity ? "AVAILABLE" : "MONITORING_UNAVAILABLE", data: activity },
    crawlerBlocks,
    database: { state: !system ? "MONITORING_UNAVAILABLE" : system.databaseConnected ? "HEALTHY" : system.databaseConfigured ? "FAILING" : "UNKNOWN" },
    providerHealth: providers,
    email: email?.dataAvailable ? { state: !email.last24Hours ? "UNKNOWN" : email.failures || email.delayed ? "DEGRADED" : "HEALTHY", windowHours: 24, deliveries: email.last24Hours, failures: email.failures, delayed: email.delayed } : { state: "MONITORING_UNAVAILABLE" },
    cms: cms?.available ? { state: cms.totals.unhealthy || cms.missingHomepageScopes.length ? "DEGRADED" : !cms.totals.scopes ? "UNKNOWN" : "HEALTHY", totals: cms.totals } : { state: "MONITORING_UNAVAILABLE" },
    alerts: alerts ? { critical: alerts.criticalCount, warning: alerts.warningCount } : null,
    scheduledJobs: { state: jobs === null ? "MONITORING_UNAVAILABLE" : jobs.length ? "OBSERVED" : "UNKNOWN", runs: jobs },
    release: getStagingReleaseReadiness(),
    nativeApplicationHealth: { state: "UNKNOWN", reason: "No installed-app crash or device-health evidence source configured." },
  };
}
