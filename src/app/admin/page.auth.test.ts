import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

type AdminHomeResource<T> = { status: "success"; data: T } | { status: "error" };
type Calls = Array<"requireAdmin" | "metrics" | "providers" | "system" | "search" | "activity">;
type PageModule = {
  loadAdminHomeData: (dependencies: ReturnType<typeof createDependencies>) => Promise<Record<string, AdminHomeResource<unknown>>>;
  getAttentionIssuesForResources: (providers: AdminHomeResource<unknown>, system: AdminHomeResource<unknown>, search: AdminHomeResource<unknown>) => Array<{ key: string; message: string; href: string; linkLabel: string }>;
};

function loadPageModule() {
  const source = readFileSync("src/app/admin/page.tsx", "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "src/app/admin/page.tsx",
  });
  const exports: Record<string, unknown> = {};
  const sandbox = {
    console: { error: () => undefined },
    exports,
    module: { exports },
    require: (specifier: string) => {
      if (specifier === "react/jsx-runtime") return { jsx: () => ({}), jsxs: () => ({}), Fragment: Symbol("Fragment") };
      if (specifier === "next/link") return { __esModule: true, default: () => ({}) };
      if (specifier === "lucide-react") return new Proxy({}, { get: () => () => ({}) });
      if (specifier === "@/components/admin/AdminPageShell") {
        return { AdminEmptyState: () => ({}), AdminPageHeader: () => ({}), AdminStatusBadge: () => ({}) };
      }
      if (specifier === "@/lib/admin-data") {
        return {
          getAdminMetrics: async () => { throw new Error("default getAdminMetrics should be injected in this test"); },
          getProviderStatuses: async () => { throw new Error("default getProviderStatuses should be injected in this test"); },
          getRecentAdminActivity: async () => { throw new Error("default getRecentAdminActivity should be injected in this test"); },
          getSafeSystemStatus: async () => { throw new Error("default getSafeSystemStatus should be injected in this test"); },
          getSearchHealth: async () => { throw new Error("default getSearchHealth should be injected in this test"); },
        };
      }
      if (specifier === "@/lib/auth-guards") {
        return { requireAdminSession: async () => { throw new Error("default requireAdminSession should be injected in this test"); } };
      }
      throw new Error(`Unexpected import in Admin Home auth test: ${specifier}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: "src/app/admin/page.tsx" });
  return sandbox.module.exports as PageModule;
}

const fixtures = {
  metrics: { totalUsers: 1, activeUsers: 1, suspendedUsers: 0, adminUsers: 1, recentSearches: 2, recentAdminActions: 3 },
  providers: [{ product: "Flights", providerName: "Duffel", environment: "Test mode", credentialsPresent: true, searchEnabled: true, bookingEnabled: false, notes: "Ready" }],
  system: { appEnvironment: "Test", databaseConfigured: true, databaseConnected: true, authConfigured: true, sessionConfigured: true, emailConfigured: true, providerCredentialsPresent: true, webhookConfigured: true, adminEmailsConfigured: true },
  search: { hasLogs: true, totalRecentSearches: 2, noResultSearches: 0, failedSearches: 0, topProducts: [{ label: "FLIGHT", count: 2 }] },
  activity: [{ id: "audit-1", title: "admin.test", detail: "admin@example.com", timestamp: "Jul 23, 2026, 4:00 PM" }],
};

function createDependencies(calls: Calls, rejected: Partial<Record<Exclude<Calls[number], "requireAdmin">, true>> = {}) {
  const resolveOrReject = async <T>(name: Exclude<Calls[number], "requireAdmin">, value: T) => {
    calls.push(name);
    if (rejected[name]) throw new Error(`${name} failed`);
    return value;
  };

  return {
    requireAdmin: async (pathname = "/admin") => {
      calls.push("requireAdmin");
      assert.equal(pathname, "/admin");
    },
    getMetrics: () => resolveOrReject("metrics", fixtures.metrics),
    getProviders: () => resolveOrReject("providers", fixtures.providers),
    getSystem: () => resolveOrReject("system", fixtures.system),
    getSearch: () => resolveOrReject("search", fixtures.search),
    getActivity: () => resolveOrReject("activity", fixtures.activity),
  };
}

function success<T>(data: T): AdminHomeResource<T> {
  return { status: "success", data };
}

const error = { status: "error" } as const;

test("Admin Home authorizes before constructing dashboard helper promises", async () => {
  const { loadAdminHomeData } = loadPageModule();
  const calls: Calls = [];
  const redirect = new Error("NEXT_REDIRECT:/auth/signin?callbackUrl=%2Fadmin");
  const dependencies = {
    ...createDependencies(calls),
    requireAdmin: async (pathname = "/admin") => {
      calls.push("requireAdmin");
      assert.equal(pathname, "/admin");
      throw redirect;
    },
  };

  await assert.rejects(() => loadAdminHomeData(dependencies), redirect);
  assert.deepEqual(calls, ["requireAdmin"]);
});

test("Admin Home marks every resource successful when all dashboard helpers resolve", async () => {
  const { loadAdminHomeData } = loadPageModule();
  const calls: Calls = [];
  const result = await loadAdminHomeData(createDependencies(calls));

  assert.deepEqual(calls, ["requireAdmin", "metrics", "providers", "system", "search", "activity"]);
  assert.deepEqual(Object.fromEntries(Object.entries(result).map(([key, value]) => [key, value.status])), {
    metrics: "success",
    providers: "success",
    system: "success",
    searchHealth: "success",
    activity: "success",
  });
});

for (const [rejectedKey, resourceKey] of [
  ["metrics", "metrics"],
  ["providers", "providers"],
  ["system", "system"],
  ["search", "searchHealth"],
  ["activity", "activity"],
] as const) {
  test(`Admin Home keeps other resources available when ${rejectedKey} rejects`, async () => {
    const { loadAdminHomeData } = loadPageModule();
    const calls: Calls = [];
    const result = await loadAdminHomeData(createDependencies(calls, { [rejectedKey]: true }));

    assert.deepEqual(calls, ["requireAdmin", "metrics", "providers", "system", "search", "activity"]);
    assert.equal(result[resourceKey].status, "error");
    for (const [key, value] of Object.entries(result)) {
      if (key !== resourceKey) assert.equal(value.status, "success", `${key} should stay available`);
    }
  });
}

test("Admin Home marks multiple failed helpers independently while preserving successful resources", async () => {
  const { loadAdminHomeData } = loadPageModule();
  const calls: Calls = [];
  const result = await loadAdminHomeData(createDependencies(calls, { metrics: true, search: true, activity: true }));

  assert.deepEqual(calls, ["requireAdmin", "metrics", "providers", "system", "search", "activity"]);
  assert.equal(result.metrics.status, "error");
  assert.equal(result.searchHealth.status, "error");
  assert.equal(result.activity.status, "error");
  assert.equal(result.providers.status, "success");
  assert.equal(result.system.status, "success");
});

test("failed provider, system and search resources create only their actionable Needs Attention issues", () => {
  const { getAttentionIssuesForResources } = loadPageModule();
  const issues = getAttentionIssuesForResources(error, error, error);

  assert.equal(JSON.stringify(issues.map((issue) => [issue.message, issue.href, issue.linkLabel])), JSON.stringify([
    ["Provider readiness could not be checked", "/admin/providers", "View Providers →"],
    ["System status could not be checked", "/admin/system", "View System →"],
    ["Search health could not be checked", "/admin/searches", "View Searches →"],
  ]));
  assert.equal(issues.length, 3);
});

test("Needs Attention uses only successful resource data and does not pass failed fallback data into normal issue generation", () => {
  const { getAttentionIssuesForResources } = loadPageModule();
  const searchWithFailureCounts = { ...fixtures.search, failedSearches: 2, noResultSearches: 1 };
  const issues = getAttentionIssuesForResources(success(fixtures.providers), error, success(searchWithFailureCounts));

  assert.equal(JSON.stringify(issues.map((issue) => issue.message)), JSON.stringify([
    "System status could not be checked",
    "2 failed searches in the last 7 days",
    "1 no-result searches in the last 7 days",
  ]));
});

test("Admin Home keeps legitimate empty activity as a successful resource", async () => {
  const { loadAdminHomeData } = loadPageModule();
  const calls: Calls = [];
  const dependencies = {
    ...createDependencies(calls),
    getActivity: async () => {
      calls.push("activity");
      return [];
    },
  };

  const result = await loadAdminHomeData(dependencies);

  assert.equal(result.activity.status, "success");
  if (result.activity.status === "success") assert.deepEqual(result.activity.data, []);
});

test("Admin Home distinguishes legitimate zero search data from a rejected search helper", async () => {
  const { loadAdminHomeData } = loadPageModule();
  const calls: Calls = [];
  const zeroSearch = { hasLogs: false, totalRecentSearches: 0, noResultSearches: 0, failedSearches: 0, topProducts: [] };
  const successResult = await loadAdminHomeData({
    ...createDependencies(calls),
    getSearch: async () => {
      calls.push("search");
      return zeroSearch;
    },
  });

  assert.equal(successResult.searchHealth.status, "success");
  if (successResult.searchHealth.status === "success") assert.deepEqual(successResult.searchHealth.data, zeroSearch);

  const rejectedCalls: Calls = [];
  const rejectedResult = await loadAdminHomeData(createDependencies(rejectedCalls, { search: true }));

  assert.equal(rejectedResult.searchHealth.status, "error");
  assert.equal(rejectedResult.providers.status, "success");
  assert.equal(rejectedResult.system.status, "success");
});
