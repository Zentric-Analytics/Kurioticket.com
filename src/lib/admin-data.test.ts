import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

type AdminDataModule = {
  getAdminMetrics: () => Promise<Record<string, unknown>>;
  getSearchHealth: () => Promise<Record<string, unknown>>;
  getRecentAdminActivity: (limit?: number) => Promise<Array<Record<string, unknown>>>;
};

const databaseEnvNames = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"];

function runAdminDataProbe(env: NodeJS.ProcessEnv) {
  const probe = String.raw`
    const { createJiti } = require("jiti");
    const jiti = createJiti(process.cwd() + "/", { interopDefault: true, alias: { "@": process.cwd() + "/src" } });
    const { getAdminMetrics, getSearchHealth, getRecentAdminActivity } = jiti("./src/lib/admin-data.ts");

    async function capture(name, task) {
      try {
        const value = await task();
        return { name, status: "resolved", value };
      } catch (error) {
        return { name, status: "rejected", errorName: error?.name, message: error?.message };
      }
    }

    Promise.all([
      capture("metrics", getAdminMetrics),
      capture("search", getSearchHealth),
      capture("activity", getRecentAdminActivity),
    ]).then((results) => {
      console.log(JSON.stringify(results));
    }).catch((error) => {
      console.error(error);
      process.exit(1);
    });
  `;

  const output = execFileSync(process.execPath, ["-e", probe], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  }).trim();
  const jsonLine = output.split("\n").findLast((line) => line.trim().startsWith("["));
  assert.ok(jsonLine, `Expected probe JSON output, received: ${output}`);

  return JSON.parse(jsonLine) as Array<{ name: string; status: "resolved" | "rejected"; value?: unknown; errorName?: string; message?: string }>;
}

function isolatedEnv(overrides: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env, ...overrides };
  for (const name of databaseEnvNames) {
    if (!(name in overrides)) delete env[name];
  }
  return env;
}

function loadAdminDataModule({ databaseConfigured, prisma }: { databaseConfigured: boolean; prisma: unknown }) {
  const source = readFileSync("src/lib/admin-data.ts", "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "src/lib/admin-data.ts",
  });
  const exports: Record<string, unknown> = {};
  const sandbox = {
    console,
    exports,
    module: { exports },
    process,
    require: (specifier: string) => {
      if (specifier === "@/lib/env") {
        return {
          getAdminEmails: () => ["admin@example.com"],
          getAuthSecret: () => "secret",
          getDuffelApiMode: () => "test",
          getFlightProviderPrimary: () => "duffel",
          getHotelProviderPrimary: () => "none",
          getHotelbedsApiMode: () => "test",
          getKayakApiMode: () => "sandbox",
          getTravelProviderMode: () => "sandbox",
        };
      }
      if (specifier === "@/lib/prisma") {
        class DatabaseUnavailableError extends Error {
          constructor(message = "Database access is not available. Check DATABASE_URL and run database migrations.") {
            super(message);
            this.name = "DatabaseUnavailableError";
          }
        }

        return {
          DatabaseUnavailableError,
          getPrisma: () => prisma,
          getOptionalPrisma: () => (databaseConfigured ? prisma : null),
          isDatabaseConfigured: () => databaseConfigured,
          withOptionalDb: async (task: (db: unknown) => Promise<unknown>, fallback: unknown) => databaseConfigured ? task(prisma) : fallback,
        };
      }
      throw new Error(`Unexpected import in admin-data test: ${specifier}`);
    },
  };

  vm.runInNewContext(outputText, sandbox, { filename: "src/lib/admin-data.ts" });
  return sandbox.module.exports as AdminDataModule;
}

test("Admin data helpers reject instead of returning fallbacks when no database is configured", () => {
  const results = runAdminDataProbe(isolatedEnv());

  assert.deepEqual(results.map((result) => [result.name, result.status, result.errorName]), [
    ["metrics", "rejected", "DatabaseUnavailableError"],
    ["search", "rejected", "DatabaseUnavailableError"],
    ["activity", "rejected", "DatabaseUnavailableError"],
  ]);
  assert.equal(results.some((result) => result.status === "resolved"), false);
});

test("Admin data helpers reject instead of returning fallbacks when the configured database is unreachable", () => {
  const results = runAdminDataProbe(isolatedEnv({ DATABASE_URL: "postgresql://user:pass@127.0.0.1:1/db?connect_timeout=1" }));

  assert.deepEqual(results.map((result) => [result.name, result.status]), [
    ["metrics", "rejected"],
    ["search", "rejected"],
    ["activity", "rejected"],
  ]);
  assert.equal(results.some((result) => (JSON.stringify(result.value) ?? "").includes("—")), false);
  assert.equal(results.some((result) => JSON.stringify(result.value) === "[]"), false);
});

test("Admin data helpers preserve legitimate zero search data and empty activity results", async () => {
  const countCalls: unknown[] = [];
  const prisma = {
    user: {
      count: async (args?: unknown) => {
        countCalls.push(args ?? null);
        return 0;
      },
    },
    searchHistory: {
      count: async (args?: unknown) => {
        countCalls.push(args ?? null);
        return 0;
      },
      groupBy: async () => [],
    },
    adminAuditLog: {
      count: async (args?: unknown) => {
        countCalls.push(args ?? null);
        return 0;
      },
      findMany: async () => [],
    },
  };
  const { getAdminMetrics, getSearchHealth, getRecentAdminActivity } = loadAdminDataModule({ databaseConfigured: true, prisma });

  await assert.doesNotReject(() => getAdminMetrics());
  assert.deepEqual(JSON.parse(JSON.stringify(await getAdminMetrics())), {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    adminUsers: 0,
    recentSearches: 0,
    recentAdminActions: 0,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await getSearchHealth())), {
    hasLogs: false,
    totalRecentSearches: 0,
    noResultSearches: 0,
    failedSearches: 0,
    topProducts: [],
  });
  assert.deepEqual(await getRecentAdminActivity(), []);
  assert.ok(countCalls.length > 0);
});
