import assert from "node:assert/strict";
import test from "node:test";

import { createAdminProductSearchRecordsReader } from "./adminProductSearchRecordsCore";

const current = new Date("2026-11-17T18:00:00.000Z");
function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "search_123456", requestId: "request_123456",
    type: "HOTEL", origin: null, destination: "London", checkIn: new Date("2026-12-01T00:00:00.000Z"),
    checkOut: new Date("2026-12-03T00:00:00.000Z"), status: "FAILED", resultCount: 0,
    latencyMs: 396, createdAt: new Date("2026-11-17T17:00:00.000Z"),
    ...overrides,
  };
}
function provider(overrides: Record<string, unknown> = {}) {
  return {
    id: "provider_123456", provider: "KAYAK sandbox",
    status: "FAILED", errorMessage: "Provider returned 401",
    latencyMs: 390, createdAt: new Date("2026-11-17T17:00:01.000Z"),
    ...overrides,
  };
}
function params(product: "HOTEL" | "CAR", filter?: string, window?: string, cursor?: string) {
  return new URLSearchParams({ product, ...(filter ? { filter } : {}), ...(window ? { window } : {}), ...(cursor ? { cursor } : {}) });
}
function setup(input: {
  authorized?: boolean;
  environment?: "staging" | "production";
  missingDatabase?: boolean;
  fail?: boolean;
  records?: Array<ReturnType<typeof record>>;
  detail?: ReturnType<typeof record> | null;
  observations?: Array<ReturnType<typeof provider>>;
} = {}) {
  const calls: { list: unknown[]; detail: unknown[]; logs: unknown[]; database: number } = { list: [], detail: [], logs: [], database: 0 };
  const reader = createAdminProductSearchRecordsReader({
    authorize: async () => input.authorized !== false,
    now: () => current,
    environment: () => input.environment ?? "staging",
    database: () => {
      calls.database++;
      if (input.missingDatabase) return null;
      return {
        searchHistory: {
          findMany: async (query: unknown) => {
            calls.list.push(query);
            if (input.fail) throw new Error("simulated data outage");
            return input.records ?? [record()];
          },
          findFirst: async (query: unknown) => {
            calls.detail.push(query);
            if (input.fail) throw new Error("simulated data outage");
            return input.detail === undefined ? record() : input.detail;
          },
        },
        apiProviderLog: {
          findMany: async (query: unknown) => {
            calls.logs.push(query);
            if (input.fail) throw new Error("simulated provider outage");
            return input.observations ?? [provider()];
          },
        },
      } as never;
    },
  });
  return { reader, calls };
}

test("deny read before interpreting filters, allocating database or reading other departments", async () => {
  const { reader, calls } = setup({ authorized: false });
  assert.equal((await reader.list(new URLSearchParams({ product: "FLIGHT", victim: "user1" }))).status, "forbidden");
  assert.equal((await reader.detail("invalid", params("CAR"))).status, "forbidden");
  assert.equal(calls.database, 0);
});

test("strict product and filter allowlist rejects unknown, duplicate and cross-department inputs", async () => {
  const { reader, calls } = setup();
  for (const p of [
    new URLSearchParams({ product: "FLIGHT" }),
    new URLSearchParams({ product: "PACKAGE" }),
    new URLSearchParams({ product: "HOTEL", identity: "registered" }),
    new URLSearchParams({ product: "CAR", environment: "production" }),
    new URLSearchParams({ product: "HOTEL", filter: "UNAUTHORIZED" }),
    new URLSearchParams({ product: "HOTEL", window: "2y" }),
    new URLSearchParams([["product", "HOTEL"], ["product", "CAR"]]),
  ]) assert.equal((await reader.list(p)).status, "invalid");
  assert.equal((await reader.detail("search_123456", new URLSearchParams({ product: "CAR", userId: "victim" }))).status, "invalid");
  assert.equal(calls.database, 0);
});

test("hotel list enforces product, current environment, 24h window and all three exception classes", async () => {
  const { reader, calls } = setup();
  const result = await reader.list(params("HOTEL", "EXCEPTIONS", "24h"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.data.items.map(x => x.id), ["search_123456"]);
  assert.equal(result.data.items[0].outcome, "FAILED");
  const where = (calls.list[0] as { where: Record<string, unknown> }).where;
  assert.equal(where.type, "HOTEL");
  assert.deepEqual(where.query, { path: ["environment"], equals: "staging" });
  const time = where.createdAt as { gte: Date; lte: Date };
  assert.equal(time.lte.toISOString(), current.toISOString());
  assert.equal(time.gte.toISOString(), "2026-11-16T18:00:00.000Z");
  assert.equal(JSON.stringify(where).includes('"FAILED","PARTIAL"'), true);
  assert.equal(JSON.stringify(where).includes('"resultCount":0'), true);
  assert.equal(JSON.stringify(where).includes("userId"), false);
});

test("car zero-results reader excludes failed searches and does not return registered customer identity", async () => {
  const { reader, calls } = setup({ records: [record({
    type: "CAR", origin: "Heathrow", destination: "Heathrow", status: "SUCCESS", resultCount: 0,
  })] });
  const result = await reader.list(params("CAR", "ZERO_RESULTS"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.data.items[0].outcome, "ZERO_RESULTS");
  assert.equal(result.data.items[0].product, "CAR");
  assert.equal("userId" in result.data.items[0], false);
  assert.equal("visitorId" in result.data.items[0], false);
  assert.equal("query" in result.data.items[0], false);
  const where = (calls.list[0] as { where: Record<string, unknown> }).where;
  assert.equal(where.type, "CAR");
  assert.equal(where.status, "SUCCESS");
  assert.equal(where.resultCount, 0);
});

test("cursor keeps exact product, filter, time window, environment and fixed as-of snapshot", async () => {
  const records = Array.from({ length: 26 }, (_, i) => record({
    id: "search_" + String(i).padStart(6, "0"),
    createdAt: new Date(current.getTime() - (i + 1) * 60_000),
  }));
  const { reader, calls } = setup({ records });
  const first = await reader.list(params("HOTEL", "EXCEPTIONS"));
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  assert.equal(first.data.items.length, 25);
  assert.ok(first.data.nextCursor);
  const token = first.data.nextCursor!;
  assert.equal((await reader.list(params("HOTEL", "EXCEPTIONS", "24h", token))).status, "ok");
  assert.equal((await reader.list(params("CAR", "EXCEPTIONS", "24h", token))).status, "invalid");
  assert.equal((await reader.list(params("HOTEL", "FAILED", "24h", token))).status, "invalid");
  assert.equal((await reader.list(params("HOTEL", "EXCEPTIONS", "7d", token))).status, "invalid");
  const matchingScope = (calls.list[1] as { where: Record<string, unknown> }).where;
  assert.equal(JSON.stringify(matchingScope).includes("search_000024"), true);
  const production = setup({ environment: "production" });
  assert.equal((await production.reader.list(params("HOTEL", "EXCEPTIONS", "24h", token))).status, "invalid");
  assert.equal(production.calls.list.length, 0);
});

test("record details can only read the requested hotel/car and current environment; raw errors are not returned", async () => {
  const { reader, calls } = setup();
  const result = await reader.detail("search_123456", params("HOTEL"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  const where = (calls.detail[0] as { where: Record<string, unknown> }).where;
  assert.equal(where.id, "search_123456");
  assert.equal(where.type, "HOTEL");
  assert.deepEqual(where.query, { path: ["environment"], equals: "staging" });
  const logQuery = calls.logs[0] as { where: Record<string, unknown> };
  assert.equal(logQuery.where.service, "hotel-search");
  assert.ok(JSON.stringify(logQuery.where).includes('"requestId"'));
  assert.ok(JSON.stringify(logQuery.where).includes('"environment"'));
  assert.equal(result.data.providerEvidence, "exact");
  assert.equal(result.data.providers[0].category, "Authentication / configuration");
  assert.equal("errorMessage" in result.data.providers[0], false);
  assert.equal("userId" in result.data.search, false);
  assert.equal("searcher" in result.data, false);
});

test("missing record and missing provider logs must not fabricate successful observations", async () => {
  const missing = setup({ detail: null });
  assert.equal((await missing.reader.detail("search_123456", params("HOTEL"))).status, "not_found");
  assert.equal(missing.calls.logs.length, 0);
  const unlinked = setup({ detail: record({ requestId: null }), observations: [] });
  const result = await unlinked.reader.detail("search_123456", params("HOTEL"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.data.providerEvidence, "unavailable");
  assert.deepEqual(result.data.providers, []);
  assert.equal(unlinked.calls.logs.length, 0);
});

test("database outage returns unavailable, not an invented empty directory", async () => {
  const missing = setup({ missingDatabase: true });
  assert.equal((await missing.reader.list(params("CAR"))).status, "unavailable");
  assert.equal((await missing.reader.detail("search_123456", params("CAR"))).status, "unavailable");
  const failed = setup({ fail: true });
  assert.equal((await failed.reader.list(params("HOTEL"))).status, "unavailable");
  assert.equal((await failed.reader.detail("search_123456", params("HOTEL"))).status, "unavailable");
});
