import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { applicationSources } from "@/lib/application-source";
import { partitionOperationalGroups, summarizeOperationalGroups, parsePlatformOperationsHours, projectScheduledJobRun, type OperationalGroup } from "./platformOperationsContract";
import { createScheduledJobObserver } from "./scheduledJobObservation";

test("combined counts reconcile with all platform partitions including historical UNKNOWN", () => {
  const rows: OperationalGroup[] = applicationSources.map((source, i) => ({ kind: "searches", source: source === "UNKNOWN" ? null : source, status: i % 2 ? "FAILED" : "SUCCESS", count: i + 10, latency: 100 }));
  rows.push({ kind: "searches", source: "native", status: "PARTIAL", count: 2, latency: 0 });
  const result = partitionOperationalGroups(rows).searches;
  for (const metric of ["total", "successful", "failed", "partial", "disabled"] as const) {
    assert.equal(result.combined[metric], Object.values(result.applications).reduce((sum, value) => sum + value[metric], 0));
  }
  assert.equal(result.applications.UNKNOWN.total, 15);
  assert.equal(result.combined.total, 48);
});
test("no observations and small samples are UNKNOWN; explicit disabled is distinct", () => {
  assert.equal(summarizeOperationalGroups([], "searches").state, "UNKNOWN");
  assert.equal(summarizeOperationalGroups([{ kind: "searches", source: null, count: 10, status: "SUCCESS", latency: null }], "searches").averageLatencyMs, null);
  assert.equal(summarizeOperationalGroups([{ kind: "searches", source: null, count: 10, status: "SUCCESS", latency: 20, latencyCount: 2 }], "searches").averageLatencyMs, 10);
  const row = { kind: "searches", source: "IOS", count: 1, latency: 1, status: "FAILED" };
  assert.equal(summarizeOperationalGroups([row], "searches").state, "UNKNOWN");
  assert.equal(summarizeOperationalGroups([{ ...row, status: "DISABLED" }], "searches").state, "DISABLED");
  assert.equal(summarizeOperationalGroups([{ ...row, count: 10 }], "searches").state, "FAILING");
  assert.throws(() => summarizeOperationalGroups([{ ...row, count: -1 }], "searches"));
});
test("job observation updates one run, preserves task failure, and stores no payload", async () => {
  const writes: unknown[] = [];
  const observe = createScheduledJobObserver({ begin: async job => { writes.push(job); return "run-1"; }, finish: async (...args) => { writes.push(args); } });
  assert.deepEqual(await observe("price-alerts", async () => ({ disabled: true })), { disabled: true });
  assert.equal((writes[1] as unknown[])[2], "DISABLED");
  await assert.rejects(observe("travel-inspiration", async () => { throw new Error("private secret"); }), /private secret/);
  assert.equal((writes[3] as unknown[])[2], "FAILED");
  assert.doesNotMatch(JSON.stringify(writes), /secret/);
  const unavailable = createScheduledJobObserver({ begin: async () => { throw new Error(); }, finish: async () => { throw new Error(); } });
  assert.equal(await unavailable("price-alerts", async () => 42), 42);
});
function loadRoute(file: string, modules: Record<string, unknown>) {
  const exports: { GET: (request: Request) => Promise<Response> } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Response, URL, URLSearchParams, Date, console: { error: () => undefined }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
  });
  return exports.GET;
}
test("health HTTP status follows database readiness and never leaks database errors", async () => {
  for (const connected of [true, false]) {
    const get = loadRoute("src/app/api/health/route.ts", { "next/server": { NextResponse: { json: Response.json } }, "@/lib/prisma": { isDatabaseConfigured: () => true, getOptionalPrisma: () => ({ $queryRaw: async () => { if (!connected) throw new Error("password=private"); } }) } });
    const response = await get(new Request("https://kurioticket.com/api/health"));
    assert.equal(response.status, connected ? 200 : 503);
    assert.doesNotMatch(await response.text(), /password=private/);
  }
});
test("operational endpoint rejects unauthorized access and client-owned environment", async () => {
  let authorized = false, calls = 0;
  const get = loadRoute("src/app/api/admin/platform-operations/route.ts", { "@/services/platformOperationsContract": { parsePlatformOperationsHours }, "@/lib/admin": { requireAdminApiSession: async () => authorized ? { session: {} } : { response: Response.json({}, { status: 403 }) } }, "@/services/platformOperationsService": { readPlatformOperations: async () => { calls++; return {}; } } });
  assert.equal((await get(new Request("https://kurioticket.com/api/admin/platform-operations"))).status, 403);
  authorized = true;
  for (const query of ["environment=staging", "hours=0", "hours=721", "hours=NaN", "hours=24&hours=168", "hours=", "hours=1e2", "hours=0x18", "hours=1.5", "hours=%2024", "hours=-1"]) assert.equal((await get(new Request("https://kurioticket.com/api/admin/platform-operations?" + query))).status, 400);
  assert.equal(calls, 0);
  const response = await get(new Request("https://kurioticket.com/api/admin/platform-operations?hours=24"));
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "private, no-store");
  const invalid = await get(new Request("https://kurioticket.com/api/admin/platform-operations?hours=24&hours=24")); assert.equal(invalid.headers.get("cache-control"),"private, no-store");
});

test("operational service scopes aggregate SQL to its environment and outages return null data", async () => {
  let offline = false;
  const modules: Record<string, unknown> = {
    "server-only": {},
    "@/lib/prisma": { getOptionalPrisma: () => ({ $transaction: async (task: (tx: unknown) => Promise<unknown>) => {
      if (offline) throw new Error("private database error");
      return task({ $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        assert.equal(values.filter(value => value === "staging").length, 4);
        assert.ok(!values.includes("production"));
        assert.match(_strings.join("?"), /service NOT IN \('scheduled-job','crawler-blocked-search'\)/);
        assert.match(_strings.join("?"), /service = 'crawler-blocked-search'/);
        return [
          { kind: "searches", source: "WEB", status: "SUCCESS", count: 2, latency: 0 },
          { kind: "crawlerBlocks", source: "CRAWLER", status: "DISABLED", count: 17, latency: 0 },
        ];
      }, apiProviderLog: { findMany: async (query: { where: { metadata: { equals: string } } }) => { assert.equal(query.where.metadata.equals, "staging"); return []; } } });
    } }) },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging", getStagingReleaseReadiness: () => null },
    "@/lib/admin-data": { getSafeSystemStatus: async () => null },
    "@/services/providerOperationalStatus": { getProviderOperationalStatuses: async () => null },
    "@/services/emailDeliveryService": { getEmailDeliveryHealthSnapshot: async () => null },
    "@/services/cmsHardeningService": { getCmsHealthOverview: async () => null },
    "./platformOperationsContract": { partitionOperationalGroups },
    "./adminAlertService": { getAdminAlertSnapshot: async () => null },
  };
  const exports: { readPlatformOperations: () => Promise<{ activity: { state: string; data: unknown }; nativeApplicationHealth: { state: string }; crawlerBlocks: number | null }> } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/services/platformOperationsService.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  const observed = await exports.readPlatformOperations();
  assert.equal(observed.activity.state, "AVAILABLE"); assert.equal(observed.nativeApplicationHealth.state, "UNKNOWN");
  assert.equal(observed.crawlerBlocks, 17);
  assert.equal((observed.activity.data as { searches: { combined: { total: number } } }).searches.combined.total, 2,
    "blocked crawler attempts must not inflate customer search totals");
  offline = true;
  const unavailable = await exports.readPlatformOperations();
  assert.equal(unavailable.activity.state, "MONITORING_UNAVAILABLE"); assert.equal(unavailable.activity.data, null);
  assert.doesNotMatch(JSON.stringify(unavailable), /private database/);
});

test("Overview search activity observes exact bounds in the deployment and distinguishes no rows from failure", async () => {
  const from = new Date("2026-11-01T00:00:00.000Z");
  const to = new Date("2026-11-09T17:30:43.751Z");
  let state: "records" | "empty" | "unavailable" = "records";
  const modules: Record<string, unknown> = {
    "server-only": {},
    "@/lib/prisma": { getOptionalPrisma: () => ({ $queryRaw: async (sql: TemplateStringsArray, ...params: unknown[]) => {
      assert.match(sql.join("?"), /FROM "SearchHistory"[\s\S]*"createdAt" >= \? AND "createdAt" < \?/);
      assert.doesNotMatch(sql.join("?"), /RedirectLog|ApiProviderLog/);
      assert.deepEqual(params, [from, to, "staging"]);
      if (state === "unavailable") throw new Error("database down");
      return state === "empty" ? [] : [
        { kind: "searches", source: "WEB", status: "SUCCESS", count: 3, latency: 0 },
        { kind: "searches", source: null, status: "FAILED", count: 2, latency: 0 },
      ];
    } }) },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
    "@/lib/admin-data": {},
    "@/services/providerOperationalStatus": {},
    "@/services/emailDeliveryService": {},
    "@/services/cmsHardeningService": {},
    "./platformOperationsContract": { partitionOperationalGroups },
    "./adminAlertService": {},
  };
  const exports: { readPlatformSearchActivity: (from: Date, to: Date) => Promise<{
    window: { from: string; to: string };
    searches: ReturnType<typeof partitionOperationalGroups>["searches"] | null;
  }> } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/services/platformOperationsService.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });

  const result = await exports.readPlatformSearchActivity(from, to);
  assert.equal(result.window.from, from.toISOString());
  assert.equal(result.window.to, to.toISOString());
  assert.equal(result.searches?.combined.total, 5);
  assert.equal(result.searches?.applications.WEB.total, 3);
  assert.equal(result.searches?.applications.UNKNOWN.total, 2);

  state = "empty";
  assert.equal((await exports.readPlatformSearchActivity(from, to)).searches?.combined.total, 0);
  state = "unavailable";
  assert.equal((await exports.readPlatformSearchActivity(from, to)).searches, null);
});

test("job projections require coherent persisted completion evidence and never turn RUNNING into failure", () => {
  const createdAt = new Date("2026-11-01T00:00:00Z"), now = new Date("2026-11-01T00:10:00Z");
  const row = { provider: "price-alerts", status: "DEGRADED", createdAt, latencyMs: 0, metadata: { environment: "staging", state: "RUNNING" } };
  assert.equal(projectScheduledJobRun(row,"staging",now).outcome,"RUNNING");
  for (const outcome of ["SUCCESS","FAILED","DEGRADED","DISABLED"]) {
    const result = projectScheduledJobRun({ ...row, status: outcome, latencyMs: 500, metadata: { environment: "staging", state: outcome, completedAt: "2026-11-01T00:00:01Z" } },"staging",now);
    assert.equal(result.outcome,outcome); assert.equal(result.durationMs,500); assert.ok(result.completedAt); assert.equal(result.environment,"staging");
  }
  for (const metadata of [null, {}, {state:"SUCCESS"}, {environment:"production",state:"RUNNING"}, {environment:"staging",state:"SUCCESS",completedAt:"bad"}, {environment:"staging",state:"SUCCESS",completedAt:"2026-12-01T00:00:00Z"}]) {
    const result = projectScheduledJobRun({...row,status:"SUCCESS",metadata},"staging",now);
    assert.equal(result.outcome,"UNKNOWN"); assert.equal(result.durationMs,null); assert.equal(result.completedAt,null);
  }
});
