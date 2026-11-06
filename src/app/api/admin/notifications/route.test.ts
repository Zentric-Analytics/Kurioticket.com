import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function harness() {
  type Alert = { key: string; signalToken: string; severity: string; source: string };
  type AuditWrite = { adminUserId: string; action: string; metadata: { source: string } };
  const writes: AuditWrite[] = [];
  const state = { denied: false, limited: false, persisted: true, alert: { key: "qa.support", signalToken: "occurrence-1", severity: "WARNING", source: "SUPPORT" } as Alert | null };
  class RateLimitError extends Error { retryAfterSeconds = 30; }
  const modules: Record<string, unknown> = {
    "next/server": { NextRequest: Request, NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/admin": {
      requireAdminApiSession: async () => state.denied ? { response: Response.json({}, { status: 403 }) } : { session: { user: { id: "server-admin", email: "admin@example.invalid" } } },
      writeAdminAuditLog: async (value: AuditWrite) => { writes.push(value); return state.persisted; },
    },
    "@/lib/auth-rate-limit": { AuthRateLimitError: RateLimitError, checkAuthRateLimit: () => { if (state.limited) throw new RateLimitError(); } },
    "@/lib/admin-data": { getSafeSystemStatus: () => { throw new Error("No outage bypass for deletion"); } },
    "@/lib/adminDatabaseOutageAccess": { getDatabaseOutageAdminToken: () => { throw new Error("No outage bypass for deletion"); } },
    "@/services/adminAlertService": {
      getCurrentAdminAlertByKey: async (key: string, admin?: string) => { assert.equal(key, "qa.support"); assert.equal(admin, undefined); return state.alert; },
      adminAlertDismissal: { action: "ADMIN_ALERT_DISMISSED", targetType: "AdminOperationalAlertDismissal" },
      adminAlertDismissalKey: (key: string, token: string) => key + "::" + token,
    },
  };
  const code = ts.transpileModule(readFileSync("src/app/api/admin/notifications/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: Record<string, unknown> = {};
  vm.runInNewContext(code, { exports: exported, module: { exports: exported }, require: (id: string) => { assert.ok(id in modules, id); return modules[id]; }, Response, Request, URL, Date }, { filename: "notifications-route.cjs" });
  const request = (body: unknown = { alertKey: "qa.support", signalToken: "occurrence-1" }) => new Request("https://example.invalid/api/admin/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { state, writes, remove: (body?: unknown): Promise<Response> => (exported.DELETE as (request: Request) => Promise<Response>)(request(body)) };
}

test("deletion uses the canonical admin identity and trusted alert, and requires durable persistence", async () => {
  const h = harness();
  assert.equal((await h.remove({ alertKey: "qa.support", signalToken: "occurrence-1", adminUserId: "someone-else", source: "forged" })).status, 200);
  assert.equal(h.writes[0].adminUserId, "server-admin");
  assert.equal(h.writes[0].action, "ADMIN_ALERT_DISMISSED");
  assert.equal(h.writes[0].metadata.source, "SUPPORT");
  assert.equal((await h.remove()).status, 200, "retry is idempotent for the same occurrence");
  h.state.persisted = false;
  assert.equal((await h.remove()).status, 503);
});

test("unauthorized, invalid and stale deletion requests never write preferences", async () => {
  const h = harness(); h.state.denied = true;
  assert.equal((await h.remove()).status, 403);
  h.state.denied = false;
  for (const body of [null, [], {}, { alertKey: "qa.support", signalToken: "x".repeat(2_001) }]) assert.equal((await h.remove(body)).status, 400);
  h.state.alert!.signalToken = "new-occurrence";
  assert.equal((await h.remove()).status, 409);
  h.state.alert = null;
  assert.equal((await h.remove()).status, 409);
  assert.equal(h.writes.length, 0);
});

test("deletion rate limits and unavailable monitoring storage do not report fake success", async () => {
  const h = harness(); h.state.limited = true;
  const limited = await h.remove();
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("Retry-After"), "30");
  h.state.limited = false;
  h.state.alert!.key = "system.database.unavailable";
  assert.equal((await h.remove()).status, 503);
  h.state.alert = { key: "qa.support", signalToken: "unpersisted:qa", severity: "WARNING", source: "SUPPORT" };
  assert.equal((await h.remove({ alertKey: "qa.support", signalToken: "unpersisted:qa" })).status, 503);
  assert.equal(h.writes.length, 0);
});
