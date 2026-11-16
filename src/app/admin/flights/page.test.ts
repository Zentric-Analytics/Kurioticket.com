import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { classifyProviderIssue } from "@/services/searchFailureDiagnostics";
import { __adminOperationalReadCoreTest } from "@/services/adminOperationalReadCore";
import { searchDetailOutcomeLabel } from "@/lib/adminSearchDetailPresentation";

const flightsPage = readFileSync("src/app/admin/flights/page.tsx", "utf8");

test("legacy Flight Operations bookmarks redirect securely to Flight Search Activity", async () => {
  const calls: string[] = [];
  const exported: Record<string, unknown> = {};
  const code = ts.transpileModule(flightsPage, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const ports: Record<string, unknown> = {
    "@/lib/auth-guards": { requireAdminSession: async (path: string) => { calls.push(path); } },
    "next/navigation": { redirect: (path: string) => { calls.push(path); throw new Error("redirected"); } },
  };
  runInNewContext(code, { exports: exported, require: (id: string) => { assert.ok(id in ports, id); return ports[id]; } });
  await assert.rejects((exported.default as () => Promise<void>)(), /redirected/);
  assert.deepEqual(calls, ["/admin/flights", "/admin/searches/activity?product=FLIGHT"]);
  assert.doesNotMatch(flightsPage, /AdminPageShell|getFlightOperationsSnapshot|Recent flight searches/);
});

test("an unauthorized legacy Flight bookmark never reaches the canonical redirect", async () => {
  const exported: Record<string, unknown> = {};
  const code = ts.transpileModule(flightsPage, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { exports: exported, require: (id: string) => {
    if (id === "@/lib/auth-guards") return { requireAdminSession: async () => { throw new Error("denied"); } };
    assert.equal(id, "next/navigation"); return { redirect: () => assert.fail("unauthorized redirect") };
  } });
  await assert.rejects((exported.default as () => Promise<void>)(), /denied/);
});

test("canonical Flight search telemetry remains environment scoped and real-data only", () => {
  const activity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
  assert.match(activity, /delete raw\.environment/);
  assert.match(activity, /params\.set\("environment", currentEnvironment\)/);
  assert.match(activity, /adminOperationalReads\.searches\.list\(listParams\)/);
  assert.match(activity, /adminOperationalReads\.searches\.summary\(params\)/);
  assert.match(activity, /Search data unavailable/);
});

test("canonical search monitoring retains provider exceptions and separate booking context", () => {
  const activity = readFileSync("src/app/admin/searches/activity/page.tsx", "utf8");
  const table = readFileSync("src/components/admin/SearchMonitorTable.tsx", "utf8");
  assert.match(activity, /buildAdminSearchProviderOptions\(getProviderIntegrationStatuses\(\)/);
  assert.match(table, /No exact provider telemetry recorded/);
  assert.match(table, /formatNumber\(search\.resultCount\)/);
  assert.doesNotMatch(table, /Booking confirmed|Live flight status/);
});

test("provider diagnostics classify issues without exposing the raw provider error", () => {
  const message = "401 provider api key synthetic-secret";
  const result = classifyProviderIssue(message);
  assert.equal(result.code, "AUTH_OR_CONFIG");
  assert.equal(result.retryable, false);
  assert.equal(JSON.stringify(result).includes("synthetic-secret"), false);
  assert.equal(classifyProviderIssue("timeout").code, "PROVIDER_TIMEOUT");
});

test("canonical zero-result SUCCESS remains distinct from operational failure", () => {
  const row: Parameters<typeof __adminOperationalReadCoreTest.fallbackSearchDiagnostic>[0] = {
    id: "search_fixture", requestId: "request_fixture", userId: null, visitorId: null,
    type: "FLIGHT", origin: "LOS", destination: "LHR", checkIn: null, checkOut: null,
    query: {}, resultCount: 0, latencyMs: 1200, status: "SUCCESS", createdAt: new Date("2030-01-01"), visitor: null, journeyEvents: [],
  };
  const result = __adminOperationalReadCoreTest.fallbackSearchDiagnostic(row);
  assert.equal(result.outcome, "ZERO_RESULTS");
  assert.equal(result.reasonCode, "NO_MATCHING_RESULTS");
  assert.equal(result.retryable, false);
  assert.equal(searchDetailOutcomeLabel(result.outcome), "No results");
  const failed = __adminOperationalReadCoreTest.fallbackSearchDiagnostic({ ...row, status: "FAILED" });
  assert.notEqual(failed.outcome, result.outcome);
  assert.equal(searchDetailOutcomeLabel(failed.outcome), "Failed");
});

test("legacy metadata does not recreate a duplicate operational workspace", () => {
  assert.match(flightsPage, /metadata = \{ title: "Admin Search Activity" \}/);
  assert.doesNotMatch(flightsPage, /provider health|Homepage fare operations|Flight Search Readiness/);
});
