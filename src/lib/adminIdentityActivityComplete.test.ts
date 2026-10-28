/* eslint-disable @typescript-eslint/no-explicit-any */
// Exercise the real reader and filter helpers. Only the database boundary is replaced.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

type Row = Record<string, any>;
const baseTime = new Date("2026-10-28T09:00:00.000Z");
const allFilters = { tab: "all", stage: "all", product: "all", from: "", to: "", q: "", order: "newest" };

function loadProduction(relative: string, overrides: Record<string, unknown> = {}): any {
  const filename = resolve(relative);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const requireSource = (id: string): unknown => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith("@/")) return loadProduction("src/" + id.slice(2) + ".ts", overrides);
    if (id.startsWith(".")) return loadProduction(resolve(dirname(filename), id + ".ts"), overrides);
    throw new Error("Unmocked runtime dependency: " + id);
  };
  new Function("require", "module", "exports", "console", output)(requireSource, module, module.exports, { error() {} });
  return module.exports;
}

// Fail on unsupported predicates rather than silently broadening a test query.
function matches(value: any, condition: any): boolean {
  if (condition === null || typeof condition !== "object") return value === condition;
  if (condition instanceof Date) return value instanceof Date && +value === +condition;
  return Object.entries(condition).every(([key, expected]: [string, any]) => {
    if (key === "AND") return (Array.isArray(expected) ? expected : [expected]).every(item => matches(value, item));
    if (key === "OR") return expected.some((item: any) => matches(value, item));
    if (key === "NOT") return !matches(value, expected);
    if (key === "is") return value != null && matches(value, expected);
    if (key === "none") return (value ?? []).every((item: any) => !matches(item, expected));
    if (key === "some") return (value ?? []).some((item: any) => matches(item, expected));
    if (key === "not") return !matches(value, expected);
    if (key === "in") return expected.includes(value);
    if (key === "lt") return value < expected;
    if (key === "lte") return value <= expected;
    if (key === "gt") return value > expected;
    if (key === "gte") return value >= expected;
    if (key === "mode") return true;
    if (key === "contains") return typeof value === "string" && value.toLowerCase().includes(expected.toLowerCase());
    if (key === "path") return true;
    if (key === "equals" && condition.path) return matches(condition.path.reduce((v: any, part: string) => v?.[part], value), expected);
    return matches(value?.[key], expected);
  });
}

function setup(kind: "guest" | "user" | "operational", count = 1105) {
  const userId = "qa-complete-account";
  const visitorId = "qa-complete-visitor";
  const id = kind === "user" ? userId : kind === "operational" ? "qa-operational-session" : visitorId;
  const visitor: Row = {
    id: visitorId, firstSeenAt: baseTime, lastSeenAt: baseTime,
    consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: kind === "user" ? userId : null,
    identityLinks: kind === "user" ? [{ userId }] : [],
    currentUser: { status: "ACTIVE", emailVerified: baseTime },
  };
  const owner = {
    userId: kind === "user" ? userId : null,
    visitorId: kind === "operational" ? null : visitorId,
    visitor: kind === "operational" ? null : visitor,
  };
  const metadata = { environment: "staging", ...(kind === "operational" ? { operationalSessionId: id } : {}) };
  const searchRows: Row[] = Array.from({ length: count }, (_, index) => ({
    ...owner, id: "qa-search-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - Math.floor(index / 17) * 1000), // ties cross batch boundaries
    type: index % 2 ? "HOTEL" : "FLIGHT", origin: "LOS", destination: index % 2 ? "Accra" : "London",
    status: "SUCCESS", query: metadata, journeyEvents: [],
  }));
  const handoffRows: Row[] = Array.from({ length: 53 }, (_, index) => ({
    ...owner, id: "qa-handoff-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - index * 1500), type: "HOTEL", provider: "Provider A",
    route: "Accra", metadata, journeyEvents: [],
  }));
  const analyticsRows: Row[] = kind === "operational" ? [] : Array.from({ length: 51 }, (_, index) => ({
    ...owner, id: "qa-analytics-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - index * 1700), type: "SAVE", metadata,
  }));
  const journeyRows: Row[] = [];
  if (kind !== "operational") {
    for (const [index, search] of searchRows.slice(0, 603).entries()) {
      const event: Row = {
        id: "qa-canonical-" + String(index).padStart(6, "0"), type: "SEARCH_COMPLETED", createdAt: search.createdAt,
        product: search.type, provider: null, metadata, searchHistoryId: search.id, redirectLogId: null,
        searchHistory: search, redirectLog: null,
        journey: { id: "qa-journey", visitorId, visitor, startedAt: baseTime },
      };
      search.journeyEvents.push(event);
      journeyRows.push(event);
    }
  }
  // These records must never become visible just because complete mode removes paging.
  const foreign = { ...searchRows[0], ...owner, id: "qa-foreign", userId: "other-account", visitorId: "other-visitor", visitor: { ...visitor, id: "other-visitor", currentUserId: "other-account" }, journeyEvents: [] };
  const production = { ...searchRows[0], id: "qa-production", query: { ...metadata, environment: "production" }, journeyEvents: [] };
  const allSearchRows = [...searchRows, ...(count ? [foreign, production] : [])];
  const calls: Array<{ source: string; take: number }> = [];
  let failAfterFirstBatch = false;
  const delegate = (source: string, rows: Row[]) => ({
    async findMany(args: Row) {
      if (failAfterFirstBatch && source === "search" && calls.some(call => call.source === source)) throw new Error("Batch unavailable");
      calls.push({ source, take: args.take });
      const matching = rows.filter(row => matches(row, args.where));
      const order = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      matching.sort((a, b) => {
        for (const item of order) {
          const [key, direction] = Object.entries(item)[0];
          const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
          if (comparison) return direction === "desc" ? -comparison : comparison;
        }
        return 0;
      });
      return matching.slice(0, args.take);
    },
    async count(args: Row) { return rows.filter(row => matches(row, args.where)).length; },
    async groupBy(args: Row) {
      const counts = new Map<string, number>();
      for (const row of rows.filter(row => matches(row, args.where))) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
      return [...counts].map(([type, total]) => ({ type, _count: { _all: total } }));
    },
  });
  let transactions = 0;
  const db: Row = {
    user: { async findUnique() { return { id: userId, name: "Test account", role: "USER", status: "ACTIVE", createdAt: baseTime }; } },
    visitor: {
      async findFirst() { return kind === "operational" ? null : visitor; },
      async findMany() { return kind === "user" ? [{ id: visitorId }] : []; },
    },
    journeyEvent: delegate("journey", journeyRows), searchHistory: delegate("search", allSearchRows),
    redirectLog: delegate("handoff", handoffRows), analyticsEvent: delegate("analytics", analyticsRows),
    async $queryRaw() { return [{ firstSeenAt: baseTime, lastSeenAt: baseTime }]; },
    async $transaction(action: (tx: Row) => Promise<unknown>, options: Row) {
      transactions++;
      assert.equal(options.isolationLevel, "RepeatableRead");
      return action(db);
    },
  };
  const service = loadProduction("src/services/adminIdentityActivityService.ts", {
    "server-only": {},
    "@/generated/prisma/client": { Prisma: { TransactionIsolationLevel: { RepeatableRead: "RepeatableRead" }, sql: () => ({}) } },
    "@/lib/prisma": { getOptionalPrisma: () => db },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
    "@/lib/adminIdentityDirectory": { escapePrismaContainsQuery: (value: string) => value },
  });
  return {
    load: (filters = allFilters, cursor?: string, mode: "page" | "all" = "all") =>
      service.loadAdminIdentityActivity(kind === "user" ? "user" : "guest", id, filters, cursor, mode),
    calls, failNextBatch: () => { failAfterFirstBatch = true; }, transactions: () => transactions,
    expected: count + handoffRows.length + analyticsRows.length,
  };
}

for (const kind of ["guest", "user", "operational"] as const) {
  test("complete " + kind + " activity includes all sources and batches without duplicates", async () => {
    const scenario = setup(kind);
    const result = await scenario.load();
    assert.equal(result.status, "ok");
    assert.equal(result.data.events.length, scenario.expected);
    assert.equal(new Set(result.data.events.map((event: Row) => event.id)).size, scenario.expected);
    assert.equal(result.data.nextCursor, null);
    assert.equal(result.data.summary.searches, 1105);
    assert.equal(result.data.summary.providerHandoffs, 53);
    assert.ok(result.data.events.every((event: Row, i: number, rows: Row[]) => !i || +rows[i - 1].at >= +event.at));
    assert.ok(!result.data.events.some((event: Row) => /foreign|production/.test(event.id)));
    assert.ok(scenario.calls.filter(call => call.source === "search").length >= 2);
    if (kind !== "operational") assert.ok(scenario.calls.filter(call => call.source === "journey").length >= 2);
    assert.ok(scenario.calls.every(call => call.take <= 500));
    assert.equal(scenario.transactions(), 1);
  });
}

test("complete reads preserve stage, product, text and inclusive UTC date filters", async () => {
  const scenario = setup("guest");
  const result = await scenario.load({ ...allFilters, tab: "searches", stage: "SEARCH_COMPLETED", product: "FLIGHT", q: "London", from: "2026-10-28", to: "2026-10-28" });
  assert.equal(result.status, "ok");
  assert.equal(result.data.events.length, 553);
  assert.equal(result.data.summary.searches, 553);
  assert.equal(result.data.summary.providerHandoffs, 0);
  const empty = await setup("guest").load({ ...allFilters, from: "2026-10-27", to: "2026-10-27" });
  assert.equal(empty.status, "ok");
  assert.equal(empty.data.events.length, 0);
  assert.equal(empty.data.summary.searches, 0);
});

test("complete mode ignores obsolete cursors but paged callers retain their existing validation", async () => {
  const result = await setup("guest").load(allFilters, "old-or-invalid-cursor");
  assert.equal(result.status, "ok");
  assert.equal(result.data.events.length, 1209);
  const legacy = await setup("guest").load(allFilters, "old-or-invalid-cursor", "page");
  assert.equal(legacy.status, "invalid_cursor");
  const page = await setup("guest").load(allFilters, undefined, "page");
  assert.equal(page.data.events.length, 20);
  assert.ok(page.data.nextCursor);
});

test("failure after the first internal batch never returns a partial success", async () => {
  const scenario = setup("operational");
  scenario.failNextBatch();
  const result = await scenario.load();
  assert.equal(result.status, "unavailable");
  assert.equal(result.data, undefined);
});

test("large histories do not hit the argument limit when calculating last-active and related windows", () => {
  const helpers = loadProduction("src/lib/adminIdentityActivity.ts");
  const rows = Array.from({ length: 200_000 }, (_, i) => ({
    id: "s-large-" + i, at: new Date(+baseTime - i * 1000), label: "Search", detail: "",
  }));
  assert.equal(helpers.latestVisibleActivityAt(rows).toISOString(), baseTime.toISOString());
  const range = helpers.relatedJourneysWindow(rows, new Date(+baseTime + 1000));
  assert.ok(range && range.from < range.to);
});


test("a non-advancing complete source fails rather than hanging or repeating history", async () => {
  const { readCompleteActivitySource } = loadProduction("src/lib/adminIdentityActivityComplete.ts");
  const batch = Array.from({ length: 500 }, (_, index) => ({ id: "qa-row-" + index, createdAt: baseTime }));
  await assert.rejects(readCompleteActivitySource("s", async () => batch), /did not advance/);
});

test("complete source reads an exact batch multiple without dropping the last row", async () => {
  const { readCompleteActivitySource } = loadProduction("src/lib/adminIdentityActivityComplete.ts");
  const rows = Array.from({ length: 1000 }, (_, index) => ({ id: String(index).padStart(6, "0"), createdAt: baseTime }));
  const calls: number[] = [];
  const result = await readCompleteActivitySource("s", async (after: { id: string } | undefined, take: number) => {
    const offset = after ? Number(after.id.slice(2)) + 1 : 0;
    calls.push(offset);
    return rows.slice(offset, offset + take);
  });
  assert.equal(result.length, 1000);
  assert.deepEqual(calls, [0, 500, 1000]);
});
