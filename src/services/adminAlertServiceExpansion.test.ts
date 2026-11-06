import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as core from "./adminAlertCore";
import * as expandedCore from "./adminExpandedAlertCore";
import * as occurrences from "./adminExpandedAlertOccurrences";
import type * as service from "./adminAlertService";

const now = new Date("2026-11-04T14:00:00.000Z");
type AuditRow = { adminUserId?: string; adminEmail?: string; action: string; targetType: string; targetId: string; createdAt: Date; metadata: Record<string, unknown> };
type AuditData = Omit<AuditRow, "createdAt">;
type Lookup = { where: { action: string; targetType: string; targetId: string } };
type Acknowledgements = { where: { adminUserId: string; action: string; targetType: string; targetId: { in: string[] }; createdAt: { gte?: Date; lte: Date } } };
function harness() {
  const audit: AuditRow[] = [];
  let reads = 0;
  const state = {
    databaseConnected: true,
    cmsAvailable: true,
    environment: "staging",
    expanded: {
      environment: "staging" as const,
      searches: ["FLIGHT", "HOTEL", "CAR"].map(product => ({ product: product as expandedCore.SearchProduct, enabled: true,
        previous: { total: 0, failed: 0, latestFailureAt: null }, current: { total: 0, failed: 0, latestFailureAt: null } })),
      support: { OPEN: { count: 2, latestAt: "2026-11-04T13:30:00.000Z" }, WAITING_ON_TEAM: { count: 0, latestAt: null } },
      users: { count: 1, latestAt: "2026-11-04T13:50:00.000Z" },
    } as expandedCore.ExpandedAlertSnapshot,
  };
  const tx = {
    $executeRaw: async () => 1,
    adminAuditLog: {
      findFirst: async ({ where }: Lookup) => audit.filter(row => row.action === where.action && row.targetType === where.targetType && row.targetId === where.targetId).at(-1) ?? null,
      findMany: async ({ where }: Acknowledgements) => audit.filter(row => row.adminUserId === where.adminUserId && row.action === where.action && row.targetType === where.targetType && where.targetId.in.includes(row.targetId) && (!where.createdAt.gte || row.createdAt >= where.createdAt.gte) && row.createdAt <= where.createdAt.lte).reverse(),
      create: async ({ data }: { data: AuditData }) => { audit.push({ ...data, createdAt: now }); return data; },
    },
  };
  const db = { ...tx, $transaction: async <T>(run: (transaction: typeof tx) => Promise<T>) => run(tx) };
  const modules: Record<string, unknown> = {
    "server-only": {}, "node:crypto": crypto,
    "@/lib/prisma": { getOptionalPrisma: () => db },
    "@/lib/stagingSafety": { getPublicEnvironment: () => state.environment },
    "@/lib/admin-data": { getSafeSystemStatus: async () => ({ databaseConfigured: true, databaseConnected: state.databaseConnected, authConfigured: true, sessionConfigured: true, emailConfigured: true }) },
    "@/services/cmsHardeningService": { getCmsHealthOverview: async () => ({ available: state.cmsAvailable, totals: { scopes: 0, unhealthy: 0, unpublishedChanges: 0 }, scopes: [] }) },
    "@/services/emailDeliveryService": { getEmailDeliveryHealthSnapshot: async () => ({ dataAvailable: true, failures: 0, delayed: 0, latest: [] }) },
    "@/services/adminFlightStatusOperationsService": { getFlightStatusIntegrationReadiness: () => ({ feedReady: false }) },
    "@/services/homepageFareSnapshotService": { readHomepageFareSnapshotStatus: async () => ({ dataAvailable: true, globalReadinessStatus: "ready", underfilledMarkets: [] }) },
    "@/services/partnerConfirmationDeliveryService": { getPartnerConfirmationBinding: () => ({ configured: false }) },
    "@/services/providerOperationalStatus": { getProviderOperationalStatuses: async () => [] },
    "@/services/adminAlertCore": core,
    "@/services/adminExpandedAlertCore": expandedCore,
    "@/services/adminExpandedAlertReader": { readExpandedAdminAlertSignals: async (database: unknown, environment: string) => { assert.equal(database, db); assert.equal(environment, state.environment); reads++; return state.expanded; } },
    "@/services/adminExpandedAlertOccurrences": occurrences,
  };
  const code = ts.transpileModule(readFileSync("src/services/adminAlertService.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: Record<string, unknown> = {};
  vm.runInNewContext(code, { exports: exported, module: { exports: exported }, require: (id: string) => { assert.ok(id in modules, `Unexpected dependency: ${id}`); return modules[id]; }, console, Date, Map, Set }, { filename: "adminAlertService.cjs" });
  return { api: exported as typeof service, audit, state, reads: () => reads };
}
test("new verified sources are present in the global snapshot and unread summary", async () => {
  const h = harness();
  const result = await h.api.getAdminAlertSnapshot("admin-a", now);
  assert.equal(result.activeCount, 2); assert.equal(result.unreadCount, 2);
  assert.deepEqual(Array.from(result.alerts, a => a.source), ["SUPPORT", "USERS"]);
  assert.ok(result.alerts.every(a => !a.signalToken.startsWith("unpersisted:")));
  const summary = await h.api.getAdminAlertSummary("admin-a", new Date(now.getTime() + 1_000));
  assert.equal(summary.activeCount, 2); assert.equal(h.reads(), 1, "summary reuses the existing 30-second candidate cache");
});
test("expanded alerts retain per-admin, signal-specific acknowledgement through refreshes", async () => {
  const h = harness();
  const first = await h.api.getAdminAlertSnapshot("admin-a", now);
  const alert = first.alerts.find(a => a.source === "SUPPORT")!;
  assert.ok(alert);
  h.audit.push({ adminUserId: "admin-a", action: "ADMIN_ALERT_ACKNOWLEDGED", targetType: "AdminOperationalAlert", targetId: alert.key, createdAt: now, metadata: { alertKey: alert.key, signalToken: alert.signalToken } });
  h.state.expanded.support!.OPEN.count = 3;
  const refreshed = await h.api.getAdminAlertSnapshot("admin-a", new Date(now.getTime() + 1_000));
  assert.equal(refreshed.unreadCount, 1);
  assert.equal(refreshed.alerts.find(a => a.key === alert.key)!.acknowledged, true);
  assert.equal(refreshed.alerts.find(a => a.key === alert.key)!.signalToken, alert.signalToken);
  assert.equal((await h.api.getAdminAlertSummary("admin-b", new Date(now.getTime() + 2_000))).unreadCount, 2);
});
test("unavailable CMS monitoring does not clear a previously recorded integrity incident", async () => {
  const h = harness(); h.state.cmsAvailable = false;
  h.audit.push({ action: "ADMIN_ALERT_CMS_STATE", targetType: "AdminCmsIntegrity", targetId: "cms-integrity", metadata: { state: "UNHEALTHY", fingerprint: "known" }, createdAt: now });
  const result = await h.api.getAdminAlertSnapshot("admin-a", now);
  const cms = result.alerts.find(a => a.key === "cms.health.unavailable");
  assert.ok(cms); assert.notEqual(cms.signalToken, "available");
  assert.equal(h.audit.filter(row => row.action === "ADMIN_ALERT_CMS_STATE").length, 1);
});
test("database outage suppresses new dependent issues while retaining the emergency snapshot", async () => {
  const h = harness(); h.state.databaseConnected = false;
  const result = await h.api.getAdminAlertSnapshot("admin-a", now);
  assert.deepEqual(Array.from(result.alerts, alert => alert.key), ["system.database.unavailable"]);
  const emergency = h.api.getDatabaseOutageAlertSnapshot(now);
  assert.equal(emergency.criticalCount, 1); assert.equal(emergency.alerts[0].key, "system.database.unavailable");
});

test("deleted notifications stay removed for that admin and occurrence, with matching summary counts", async () => {
  const h = harness();
  const initial = await h.api.getAdminAlertSnapshot("admin-a", now);
  const alert = initial.alerts.find(a => a.source === "SUPPORT")!;
  h.audit.push({ adminUserId: "admin-a", action: h.api.adminAlertDismissal.action, targetType: h.api.adminAlertDismissal.targetType,
    targetId: h.api.adminAlertDismissalKey(alert.key, alert.signalToken), createdAt: now, metadata: { alertKey: alert.key, signalToken: alert.signalToken } });
  const own = await h.api.getAdminAlertSnapshot("admin-a", new Date(now.getTime() + 30 * 60 * 60_000));
  assert.equal(own.activeCount, 1);
  assert.equal(own.unreadCount, 1);
  assert.equal(own.alerts.some(a => a.key === alert.key), false);
  assert.equal((await h.api.getAdminAlertSummary("admin-a", new Date(now.getTime() + 30 * 60 * 60_000))).unreadCount, 1);
  assert.equal((await h.api.getAdminAlertSnapshot("admin-b", now)).activeCount, 2);
  assert.equal((await h.api.getAdminAlertSnapshot(undefined, now)).activeCount, 2, "deletion never resolves the underlying incident");
  assert.equal(await h.api.getCurrentAdminAlertByKey(alert.key) !== null, true, "a retry can still validate the authoritative occurrence");
});

test("a fresh occurrence and a different environment are not hidden by a prior deletion", async () => {
  const h = harness();
  const initial = await h.api.getAdminAlertSnapshot("admin-a", now);
  const alert = initial.alerts.find(a => a.source === "SUPPORT")!;
  const oldKey = h.api.adminAlertDismissalKey(alert.key, alert.signalToken);
  h.audit.push({ adminUserId: "admin-a", action: h.api.adminAlertDismissal.action, targetType: h.api.adminAlertDismissal.targetType,
    targetId: oldKey, createdAt: now, metadata: {} });
  h.state.expanded.support!.OPEN.count = 0;
  await h.api.getAdminAlertSnapshot("admin-a", new Date(now.getTime() + 1_000));
  h.state.expanded.support!.OPEN.count = 2;
  const next = await h.api.getAdminAlertSnapshot("admin-a", new Date(now.getTime() + 2_000));
  const reopened = next.alerts.find(a => a.source === "SUPPORT")!;
  assert.ok(reopened);
  assert.notEqual(reopened.signalToken, alert.signalToken);
  h.state.environment = "production";
  assert.notEqual(h.api.adminAlertDismissalKey(alert.key, alert.signalToken), oldKey);
});
