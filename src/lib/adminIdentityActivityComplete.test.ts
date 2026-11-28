/* eslint-disable @typescript-eslint/no-explicit-any */
// Exercise the real reader and filter helpers. Only the database boundary is replaced.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

type Row = Record<string, any>;
const baseTime = new Date("2026-10-28T09:00:00.000Z");
const jsonAnyNull = Symbol("JSON null or missing");
const allFilters = { tab: "all", stage: "all", product: "all", from: "", to: "", q: "", order: "newest" };

function loadProduction(relative: string, overrides: Record<string, unknown> = {}): any {
  const filename = resolve(relative);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  const requireSource = (id: string): unknown => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith("@/")) return loadProduction("src/" + id.slice(2) + ".ts", overrides);
    if (id.startsWith(".")) return loadProduction(resolve(dirname(filename), id + ".ts"), overrides);
    throw new Error("Unmocked runtime dependency: " + id);
  };
  new Function("require", "module", "exports", "console", output)(requireSource, loadedModule, loadedModule.exports, { error() {} });
  return loadedModule.exports;
}

// Fail on unsupported predicates rather than silently broadening a test query.
function matches(value: any, condition: any): boolean {
  if (condition === jsonAnyNull) return value == null;
  if (condition === null || typeof condition !== "object") return value === condition;
  if (condition instanceof Date) return value instanceof Date && +value === +condition;
  return Object.entries(condition).every(([key, expected]: [string, any]) => {
    if (key === "AND") return (Array.isArray(expected) ? expected : [expected]).every(item => matches(value, item));
    if (key === "OR") return expected.some((item: any) => matches(value, item));
    if (key === "NOT") return !matches(value, expected);
    if (key === "is") return value != null && matches(value, expected);
    if (key === "none") return (value ?? []).every((item: any) => !matches(item, expected));
    if (key === "some") return (value ?? []).some((item: any) => matches(item, expected));
    if (key === "not" && condition.path) return !matches(condition.path.reduce((v: any, part: string) => v?.[part], value), expected);
    if (key === "not") return !matches(value, expected);
    if (key === "in") return expected.includes(value);
    if (key === "notIn") return !expected.includes(value);
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

function setup(kind: "guest" | "user" | "operational", count = 1105, products = ["FLIGHT", "HOTEL"], includeOfferJourneys = false, handoffProduct: "FLIGHT" | "HOTEL" | "CAR" = "HOTEL", registeredLinkedVisitors = 1, eventBearingVisitors = 1, pageViews = 0) {
  const userId = "qa-complete-account";
  const visitorId = "qa-complete-visitor";
  const id = kind === "user" ? userId : kind === "operational" ? "b9ab6aa4-e28f-4daf-9b10-b1bb5616f6ef" : visitorId;
  const visitor: Row = {
    id: visitorId, firstSeenAt: baseTime, lastSeenAt: baseTime,
    consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: kind === "user" ? userId : null,
    identityLinks: kind === "user" ? [{ userId }] : [],
    currentUser: { status: "ACTIVE", emailVerified: baseTime },
  };
  let identityVisitor: Row | null = kind === "operational" ? null : visitor;
  const owner = {
    userId: kind === "user" ? userId : null,
    visitorId: kind === "operational" ? null : visitorId,
    visitor: kind === "operational" ? null : visitor,
  };
  const metadata = { environment: "staging", ...(kind === "operational" ? { operationalSessionId: id } : {}) };
  const searchRows: Row[] = Array.from({ length: count }, (_, index) => ({
    ...owner, id: "qa-search-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - Math.floor(index / 17) * 1000), // ties cross batch boundaries
    type: products[index % products.length], origin: "LOS", destination: index % 2 ? "Accra" : "London",
    status: "SUCCESS", resultCount: index === 0 ? 0 : 535, countAsSearch: true, query: metadata, journeyEvents: [],
  }));
  const handoffRows: Row[] = Array.from({ length: 53 }, (_, index) => ({
    ...owner, id: "qa-handoff-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - index * 1500), type: handoffProduct, provider: "Provider A",
    route: "Accra", metadata, journeyEvents: [],
  }));
  const analyticsRows: Row[] = kind === "operational" ? [] : Array.from({ length: 51 }, (_, index) => ({
    ...owner, id: "qa-analytics-" + String(index).padStart(6, "0"),
    createdAt: new Date(+baseTime - index * 1700), type: "SAVE", metadata,
  }));
  // Mix historical platform declarations and current labels. Invalid routes,
  // foreign ownership and production rows must not inflate page counts.
  if (kind !== "operational" && pageViews) {
    const platforms = ["iOS app (reported)", "iOS app", "Mobile web (reported)", "Android app"];
    for (let index = 0; index < pageViews; index++) {
      analyticsRows.push({ ...owner, id: "qa-page-" + String(index).padStart(6, "0"),
        createdAt: new Date(+baseTime - index * 1000), type: "PAGE_VIEW", name: "page_viewed",
        metadata: { environment: "staging", pageKey: "support", transport: index % 4 === 2 ? "web" : "native", platform: platforms[index % 4] } });
    }
    const sample = analyticsRows.at(-1)!;
    analyticsRows.push(
      { ...sample, id: "qa-page-foreign", userId: "other-account", visitorId: "other-visitor",
        visitor: { ...visitor, id: "other-visitor", currentUserId: "other-account", identityLinks: [{ userId: "other-account" }] } },
      { ...sample, id: "qa-page-production", metadata: { ...sample.metadata, environment: "production" } },
      { ...sample, id: "qa-page-bad-route", metadata: { ...sample.metadata, pageKey: "notifications", transport: "web" } },
    );
  }
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
    if (includeOfferJourneys) {
      // Two selected offers from two distinct recorded journeys.
      for (const [index, journeyId] of ["qa-journey", "qa-journey-extra"].entries()) {
        const search = searchRows[index];
        const event: Row = {
          id: "qa-offer-" + index, type: "OFFER_SELECTED", createdAt: search.createdAt,
          product: search.type, provider: "Example provider", metadata,
          searchHistoryId: search.id, redirectLogId: null,
          searchHistory: search, redirectLog: null,
          journey: { id: journeyId, visitorId, visitor, startedAt: baseTime },
        };
        search.journeyEvents.push(event);
        journeyRows.push(event);
      }
    }
  }
  // These records must never become visible just because complete mode removes paging.
  const foreign = { ...searchRows[0], ...owner, id: "qa-foreign", userId: "other-account", visitorId: "other-visitor", visitor: { ...visitor, id: "other-visitor", currentUserId: "other-account" }, journeyEvents: [] };
  const production = { ...searchRows[0], id: "qa-production", query: { ...metadata, environment: "production" }, journeyEvents: [] };
  const allSearchRows = [...searchRows, ...(count ? [foreign, production] : [])];
  const journeysById = new Map<string, Row>();
  for (const event of journeyRows) {
    const journey = event.journey;
    if (!journeysById.has(journey.id)) journeysById.set(journey.id, { ...journey, events: [] });
    journeysById.get(journey.id)!.events.push(event);
  }
  const calls: Array<{ source: string; take: number; skip?: number; replacementValidation: boolean;
    auditReplacement: boolean; where: Row; inSnapshot: boolean }> = [];
  let historyReads = 0;
  let failSourceAfterFirstBatch: string | null = null;
  let failAuditReplacement = false;
  let inSnapshot = false;
  const delegate = (source: string, rows: Row[]) => ({
    async findMany(args: Row) {
      historyReads++;
      if (failAuditReplacement && args.select?.eventKey) throw new Error("Audit replacement unavailable");
      if (failSourceAfterFirstBatch === source && calls.some(call => call.source === source)) throw new Error("Batch unavailable");
      calls.push({ source, take: args.take, skip: args.skip, replacementValidation: Boolean(args.select?.journeyEvents),
        auditReplacement: Boolean(args.select?.eventKey), where: args.where, inSnapshot });
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
      const selected = matching.slice(args.skip ?? 0, (args.skip ?? 0) + args.take);
      // Replacement validation selects only canonical events eligible for the
      // current view, just like Prisma's nested relation where clause.
      return args.select?.journeyEvents ? selected.map(row => ({ ...row,
        journeyEvents: row.journeyEvents.filter((event: Row) => matches(event, args.select.journeyEvents.where)),
      })) : selected;
    },
    async count(args: Row) { historyReads++; return rows.filter(row => matches(row, args.where)).length; },
    async groupBy(args: Row) {
      historyReads++;
      const counts = new Map<string, number>();
      for (const row of rows.filter(row => matches(row, args.where))) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
      return [...counts].map(([type, total]) => ({ type, _count: { _all: total } }));
    },
  });
  let transactions = 0;
  const transactionOptions: Row[] = [];
  const candidateQueries: Row[] = [];
  const activeVisitorIds = [visitorId, ...Array.from({ length: Math.max(0, eventBearingVisitors - 1) },
    (_, n) => "qa-extra-visitor-" + String(n).padStart(3, "0"))].sort();
  const db: Row = {
    user: { async findUnique() { return { id: userId, name: "Test account", role: "USER", status: "ACTIVE", createdAt: baseTime }; } },
    visitor: {
      async findFirst(args: Row) { return identityVisitor && matches(identityVisitor, args.where) ? identityVisitor : null; },
      async findUnique(args: Row) { return identityVisitor?.id === args.where.id ? identityVisitor : null; },
      async findMany(args: Row) {
        if (kind !== "user") return [];
        candidateQueries.push(args.where);
        assert.equal(args.take, 100);
        assert.ok(registeredLinkedVisitors >= eventBearingVisitors);
        // Simulate a database with 150 eligible links but only 6 visitor
        // identities carrying stage/time-matching journey events. The
        // candidate DB predicate must be used; returning all 150 would
        // expand the per-visitor ownership OR clauses unnecessarily.
        assert.ok(args.where.AND.some((part: Row) => part.journeys?.some?.events?.some));
        const from = args.cursor ? activeVisitorIds.indexOf(args.cursor.id) + 1 : 0;
        return activeVisitorIds.slice(from, from + args.take).map(id => ({ id }));
      },
      async count(args: Row) {
        if (kind !== "user") return 0;
        assert.ok(args.where.AND.some((part: Row) => part.journeys?.some?.events?.some));
        return eventBearingVisitors;
      },
    },
    journeyEvent: delegate("journey", journeyRows), searchHistory: delegate("search", allSearchRows),
    redirectLog: delegate("handoff", handoffRows), analyticsEvent: delegate("analytics", analyticsRows),
    searchJourney: { async count(args: Row) {
      historyReads++;
      return [...journeysById.values()].filter(journey => matches(journey, args.where)).length;
    } },
    async $queryRaw(query?: Row) {
      historyReads++;
      if (query?.activityHandoffIds) {
        const firstMatchingSearch = searchRows.find(row => row.type === handoffProduct);
        return kind === "operational" && firstMatchingSearch && query.activityHandoffIds.includes(handoffRows[0].id)
          ? [{ id: handoffRows[0].id, searchHistoryId: firstMatchingSearch.id }] : [];
      }
      return [{ firstSeenAt: baseTime, lastSeenAt: baseTime }];
    },
    async $transaction(action: (tx: Row) => Promise<unknown>, options: Row) {
      transactions++;
      transactionOptions.push(options);
      assert.equal(options.isolationLevel, "RepeatableRead");
      inSnapshot = true;
      try { return await action(db); } finally { inSnapshot = false; }
    },
  };
  const productionOverrides = {
    "server-only": {},
    "@/generated/prisma/client": { Prisma: { AnyNull: jsonAnyNull, TransactionIsolationLevel: { RepeatableRead: "RepeatableRead" }, sql: () => ({}) } },
    "@/lib/prisma": { getOptionalPrisma: () => db },
    "@/services/adminHandoffEvidence": { handoffEvidenceForActivitySql: (ids: string[], environment: string) => { assert.equal(environment, "staging"); assert.ok(ids.length <= 500 && ids.every(id => handoffRows.some(row => row.id === id))); return { activityHandoffIds: ids }; } },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging" },
    "@/lib/adminIdentityDirectory": { escapePrismaContainsQuery: (value: string) => value },
  };
  const service = loadProduction("src/services/adminIdentityActivityService.ts", productionOverrides);
  return {
    load: (filters = allFilters, cursor?: string, mode: "page" | "all" | "summary" = "all", pageHistory?: { page: number; platform: string }) =>
      service.loadAdminIdentityActivity(kind === "user" ? "user" : "guest", id, filters, cursor, mode, pageHistory),
    loadUnified: async (filters = allFilters) => {
      const unexpectedAccess = () => { throw new Error("Ineligible identity reached access history"); };
      const unified = loadProduction("src/services/adminUnifiedActivityService.ts", {
        ...productionOverrides,
        "@/services/adminIdentityActivityService": service,
        "@/services/adminAuditReadService": { canReadAdminAudit: async () => false },
        "@/lib/adminGuestAccessSql": { guestAccessRecordsSql: unexpectedAccess, accessDatePredicate: unexpectedAccess },
        "@/lib/guestAccessObservation": {},
      });
      return unified.loadAdminUnifiedActivity(kind === "user" ? "user" : "guest", id, filters, undefined, baseTime);
    },
    setGuestVisitor: (state: Row | null) => { identityVisitor = state ? { ...visitor, ...state, id } : null; },
    historyReads: () => historyReads,
    transactionOptions, calls, candidateQueries,
    failNextBatch: (source = "search") => { failSourceAfterFirstBatch = source; }, transactions: () => transactions,
    failAuditReplacement: () => { failAuditReplacement = true; },
    records: { searches: searchRows, handoffs: handoffRows, analytics: analyticsRows, journeys: journeyRows },
    expected: count + handoffRows.length + analyticsRows.length,
  };
}

test("a true operational UUID remains readable in page, all and summary modes", async () => {
  for (const mode of ["page", "all", "summary"] as const) {
    const scenario = setup("operational", 3);
    const result = await scenario.load(allFilters, undefined, mode);
    assert.equal(result.status, "ok", mode);
    assert.equal(result.data.source, "operational", mode);
    assert.equal(result.data.summary.searches, 3, mode);
    assert.equal(result.data.summary.providerHandoffs, 53, mode);
    assert.ok(scenario.historyReads() > 0, mode);
  }
});

test("an existing ineligible UUID Visitor never falls back to operational history", async () => {
  const states: Row[] = [
    { consentStatus: "WITHDRAWN" },
    { trackingDisabledAt: baseTime },
    { currentUserId: "qa-linked-account" },
    { identityLinks: [{ userId: "qa-linked-account" }] },
  ];
  for (const state of states) {
    for (const mode of ["page", "all", "summary"] as const) {
      const scenario = setup("operational", 3);
      scenario.setGuestVisitor(state);
      assert.deepEqual(await scenario.load(allFilters, undefined, mode), { status: "not_found" }, mode);
      assert.equal(scenario.historyReads(), 0, mode);
      assert.equal(scenario.transactions(), 0, mode);
    }
  }
});

test("unified guest activity stops at the canonical ineligible identity result", async () => {
  for (const tab of ["all", "access"]) {
    const scenario = setup("operational", 3);
    scenario.setGuestVisitor({ consentStatus: "WITHDRAWN" });
    assert.deepEqual(await scenario.loadUnified({ ...allFilters, tab }), { status: "not_found" }, tab);
    assert.equal(scenario.historyReads(), 0, tab);
    assert.equal(scenario.transactions(), 0, tab);
  }
});

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
    assert.equal(result.data.summary.offersSelected, 0);
    assert.equal(result.data.summary.journeysTracked, kind === "operational" ? 0 : 1);
    assert.ok(result.data.events.every((event: Row, i: number, rows: Row[]) => !i || +rows[i - 1].at >= +event.at));
    assert.ok(!result.data.events.some((event: Row) => /foreign|production/.test(event.id)));
    assert.ok(scenario.calls.filter(call => call.source === "search").length >= 2);
    if (kind !== "operational") assert.ok(scenario.calls.filter(call => call.source === "journey").length >= 2);
    assert.ok(scenario.calls.every(call => call.take <= 500));
    assert.equal(scenario.transactions(), 1);
  });
}

test("operational Cars identity activity includes CAR redirects when filtered", async () => {
  const scenario = setup("operational", 3, ["CAR"], false, "CAR");
  const filtered = await scenario.load({ ...allFilters, product: "CAR" });
  assert.equal(filtered.status, "ok");
  assert.equal(filtered.data.summary.providerHandoffs, 53);
  assert.equal(filtered.data.summary.searches, 3);
  assert.equal(filtered.data.events.filter((event: Row) => event.stage === "PROVIDER_HANDOFF_STARTED" && event.product === "CAR").length, 53);
  const hotelOnly = await scenario.load({ ...allFilters, product: "HOTEL" });
  assert.equal(hotelOnly.status, "ok");
  assert.equal(hotelOnly.data.summary.providerHandoffs, 0);
});

test("offer selections and distinct journeys follow the exact authorized, filtered activity window", async () => {
  for (const kind of ["guest", "user"] as const) {
    const scenario = setup(kind, 40, ["FLIGHT", "HOTEL"], true);
    const result = await scenario.load();
    assert.equal(result.status, "ok");
    assert.equal(result.data.summary.offersSelected, 2);
    assert.equal(result.data.summary.journeysTracked, 2);
    assert.equal(result.data.summary.searches, 40);
    const searchOnly = await scenario.load({ ...allFilters, tab: "searches" });
    assert.equal(searchOnly.data.summary.offersSelected, 0);
    assert.equal(searchOnly.data.summary.journeysTracked, 1);
    const selectedOnly = await scenario.load({ ...allFilters, tab: "selections" });
    assert.equal(selectedOnly.data.summary.offersSelected, 2);
    assert.equal(selectedOnly.data.summary.journeysTracked, 2);
    const filtered = await scenario.load({ ...allFilters, tab: "selections", product: "HOTEL" });
    assert.equal(filtered.data.summary.offersSelected, 1);
    assert.equal(filtered.data.summary.journeysTracked, 1);
  }
  const operational = await setup("operational", 40).load();
  assert.equal(operational.data.summary.offersSelected, 0);
  assert.equal(operational.data.summary.journeysTracked, 0);
});

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


test("complete transactions scale their time budget with matching history while paged reads stay bounded", async () => {
  const small = setup("guest", 50);
  const large = setup("guest", 2505);
  assert.equal((await small.load()).status, "ok");
  assert.equal((await large.load()).status, "ok");
  assert.ok(large.transactionOptions[0].timeout > small.transactionOptions[0].timeout);
  assert.ok(large.transactionOptions[0].timeout > 30_000);
  const paged = setup("guest", 2505);
  await paged.load(allFilters, undefined, "page");
  assert.equal(paged.transactionOptions[0].timeout, 30_000);
});

test("complete-read budget accounts for every source and visitor batch without overflowing timers", () => {
  const { completeActivityReadTimeout } = loadProduction("src/lib/adminIdentityActivityComplete.ts");
  assert.ok(completeActivityReadTimeout([100_000, 100_000, 100_000, 100_000], 500)
    > completeActivityReadTimeout([500, 500, 500, 500], 1));
  assert.ok(completeActivityReadTimeout([0, 0, 0, 0], 500)
    > completeActivityReadTimeout([0, 0, 0, 0], 0));
  const maximum = completeActivityReadTimeout([Number.MAX_SAFE_INTEGER], 0);
  assert.equal(maximum, 2_147_483_647);
  assert.throws(() => completeActivityReadTimeout([-1], 0), /Invalid activity read volume/);
});

for (const kind of ["guest", "user", "operational"] as const) {
  test("complete " + kind + " search breakdown uses deduplicated eligible records including repeats", async () => {
    const result = await setup(kind).load();
    assert.equal(result.status, "ok");
    assert.deepEqual(result.data.summary.searchProducts, { flights: 553, hotels: 552, cars: 0, other: 0 });
    const filtered = await setup(kind).load({ ...allFilters, product: "HOTEL" });
    assert.deepEqual(filtered.data.summary.searchProducts, { flights: 0, hotels: 552, cars: 0, other: 0 });
    const noSearch = await setup(kind).load({ ...allFilters, tab: "handoffs" });
    assert.deepEqual(noSearch.data.summary.searchProducts, { flights: 0, hotels: 0, cars: 0, other: 0 });
  });
}

for (const kind of ["guest", "user", "operational"] as const) {
  test(kind + " product counts reconcile including packages and unknown products", async () => {
    const result = await setup(kind, 10, ["FLIGHT", "HOTEL", "CAR", "PACKAGE", "UNKNOWN"]).load();
    assert.equal(result.status, "ok");
    assert.deepEqual(result.data.summary.searchProducts, { flights: 2, hotels: 2, cars: 2, packages: 2, other: 2 });
    assert.equal(Object.values(result.data.summary.searchProducts).reduce((sum: number, n) => sum + Number(n), 0), result.data.summary.searches);
  });
}

test("registered account with 150 eligible links checks only 6 event-bearing visitors without hiding history", async () => {
  const scenario = setup("user", 113, ["FLIGHT", "HOTEL"], true, "HOTEL", 150, 6);
  const result = await scenario.load();
  assert.equal(result.status, "ok");
  assert.equal(result.data.events.length, scenario.expected + 2);
  assert.equal(result.data.summary.searches, 113);
  assert.equal(result.data.summary.offersSelected, 2);
  assert.equal(result.data.summary.journeysTracked, 2);
  assert.equal(scenario.candidateQueries.length, 1);
  assert.equal(scenario.transactionOptions.length, 1);
  assert.equal(scenario.transactionOptions[0].isolationLevel, "RepeatableRead");
  assert.deepEqual(scenario.candidateQueries[0].AND[0].identityLinks, {
    some: { userId: "qa-complete-account" },
    none: { userId: { not: "qa-complete-account" } },
  });
  assert.deepEqual(scenario.candidateQueries[0].AND[1].journeys.some.events.some.type.in, [
    "SEARCH_COMPLETED", "RESULTS_VIEWED", "FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_HANDOFF_STARTED",
    "RESULT_SAVED", "RESULT_UNSAVED", "RESULT_SHARED", "PRICE_ALERT_CREATED", "SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED",
    "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED",
  ]);
});

test("overview page visits retain exact totals while separate history pages match every authorized record", async () => {
  for (const kind of ["guest", "user"] as const) {
    const scenario = setup(kind, 40, ["FLIGHT", "HOTEL"], false, "HOTEL", 1, 1, 46);
    const summary = await scenario.load(allFilters, undefined, "summary");
    assert.equal(summary.status, "ok");
    assert.equal(summary.data.summary.searches, 40);
    assert.equal(summary.data.summary.pagesVisited, 46);
    assert.equal(summary.data.summary.recordedActions, 190);
    assert.equal(summary.data.events.length, 5);
    const recent = summary.data.events.filter((event: Row) => event.stage === "PAGE_VIEW");
    assert.equal(recent.length, 1);
    assert.deepEqual(recent.map((row: Row) => row.id), ["e-qa-page-000000"]);
    assert.ok(scenario.calls.some(call => call.source === "analytics" && call.take === 45));
    const pageFilters = { ...allFilters, tab: "pages" };
    const full = await scenario.load(pageFilters, undefined, "all");
    assert.equal(full.data.events.length, 46);
    const ids: string[] = [];
    for (const page of [1, 2, 3]) {
      const history = await scenario.load(pageFilters, undefined, "page", { page, platform: "all" });
      assert.equal(history.status, "ok");
      assert.equal(history.data.summary.pagesVisited, 46);
      assert.equal(history.data.events.length, page === 3 ? 6 : 20);
      ids.push(...history.data.events.map((row: Row) => row.id));
    }
    assert.deepEqual(ids, full.data.events.map((row: Row) => row.id));
    assert.ok(scenario.calls.some(call => call.source === "analytics" && call.skip === 40 && call.take === 20));
    const filtered = await scenario.load({ ...pageFilters, q: "Support" }, undefined, "page", { page: 1, platform: "ios" });
    assert.equal(filtered.status, "ok");
    assert.equal(filtered.data.summary.pagesVisited, 24);
    assert.ok(filtered.data.events.every((row: Row) => row.pageView.platform === "iOS app"));
    const missing = await scenario.load({ ...pageFilters, q: "No matching page" }, undefined, "page", { page: 1, platform: "all" });
    assert.equal(missing.data.summary.pagesVisited, 0);
    assert.equal(missing.data.events.length, 0);
  }
});

test("operational guest sessions cannot acquire optional page history", async () => {
  const scenario = setup("operational", 3);
  const result = await scenario.load({ ...allFilters, tab: "pages" }, undefined, "page", { page: 1, platform: "all" });
  assert.equal(result.status, "ok");
  assert.equal(result.data.summary.pagesVisited, 0);
  assert.equal(result.data.events.length, 0);
  assert.ok(!scenario.calls.some(call => call.source === "analytics"));
});

test("operational activity carries only verified search links and existing result counts", async () => {
  const scenario = setup("operational", 3, ["FLIGHT", "HOTEL"]);
  const result = await scenario.load();
  assert.equal(result.status, "ok");
  const events = result.data.events as Row[];
  assert.equal(events.find(row => row.id === "s-qa-search-000000")?.resultCount, 0);
  assert.equal(events.find(row => row.id === "s-qa-search-000001")?.resultCount, 535);
  assert.equal(events.find(row => row.id === "r-qa-handoff-000000")?.searchHistoryId, "qa-search-000001");
  assert.equal(events.find(row => row.id === "r-qa-handoff-000001")?.searchHistoryId, null);
  assert.equal(result.data.summary.journeysTracked, 0);
  assert.equal(result.data.summary.resultsViewed, 0);
  assert.equal(result.data.summary.offersSelected, 0);
});

test("45 linked analytics rows cannot hide the six older eligible account actions", async () => {
  for (const kind of ["guest", "user"] as const) {
    const scenario = setup(kind, 0);
    scenario.records.handoffs.length = 0;
    for (const row of scenario.records.analytics.slice(0, 45)) {
      row.metadata = { ...row.metadata, linkedJourneyId: "qa-linked-journey", linkedSearchHistoryId: "qa-linked-search" };
    }
    const filters = { ...allFilters, tab: "interactions" };
    const result = await scenario.load(filters, undefined, "page");
    assert.equal(result.status, "ok");
    assert.deepEqual(result.data.events.map((row: Row) => row.id), scenario.records.analytics.slice(45).map(row => "e-" + row.id));
    assert.equal(result.data.summary.recordedActions, 6);
    assert.equal(result.data.nextCursor, null);
    const overview = await scenario.load(filters, undefined, "summary");
    assert.equal(overview.data.events.length, 5);
    assert.equal(overview.data.summary.recordedActions, 6);
    assert.deepEqual(overview.data.events, result.data.events.slice(0, 5));
  }
});

test("linked suppression keeps its exact JSON type rules for rows and counts", async () => {
  const scenario = setup("guest", 0);
  scenario.records.handoffs.length = 0;
  scenario.records.analytics.splice(6);
  const metadata = [
    { linkedJourneyId: "journey", linkedSearchHistoryId: "search" },
    { linkedJourneyId: "journey" },
    { linkedSearchHistoryId: "search" },
    { linkedJourneyId: 7, linkedSearchHistoryId: "search" },
    { linkedJourneyId: "journey", linkedSearchHistoryId: null },
    {},
  ];
  scenario.records.analytics.forEach((row, index) => { row.metadata = { environment: "staging", ...metadata[index] }; });
  const result = await scenario.load(allFilters, undefined, "summary");
  assert.equal(result.status, "ok");
  assert.equal(result.data.summary.recordedActions, 5);
  assert.deepEqual(result.data.events.map((row: Row) => row.id), scenario.records.analytics.slice(1).map(row => "e-" + row.id));
});

test("every eligible action remains reachable in 20-row mixed-source pages and stable tied order", async () => {
  for (const order of ["newest", "oldest"]) {
    const scenario = setup("user", 113, ["FLIGHT", "HOTEL"], true, "HOTEL", 1, 1, 46);
    const filters = { ...allFilters, order, to: "2026-10-28T09:01:00.000Z" };
    const complete = await scenario.load(filters);
    assert.equal(complete.status, "ok");
    const rows: Row[] = [];
    const cursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const result = await scenario.load(filters, cursor, "page");
      assert.equal(result.status, "ok");
      assert.equal(result.data.summary.recordedActions, complete.data.events.length);
      assert.ok(result.data.events.length <= 20);
      if (result.data.nextCursor) assert.equal(result.data.events.length, 20);
      rows.push(...result.data.events);
      cursor = result.data.nextCursor ?? undefined;
      if (cursor) {
        assert.ok(!cursors.has(cursor), "every cursor must advance");
        cursors.add(cursor);
      }
    } while (cursor);
    assert.deepEqual(rows.map(row => row.id), complete.data.events.map((row: Row) => row.id));
    assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  }
});

test("overview is exactly the latest five global actions even when all five are page visits", async () => {
  for (const kind of ["guest", "user"] as const) {
    const scenario = setup(kind, 1105, ["FLIGHT", "HOTEL"], false, "HOTEL", 1, 1, 46);
    scenario.records.analytics.filter(row => row.type === "PAGE_VIEW").forEach((row, index) => {
      row.createdAt = new Date(+baseTime + 10_000 - index * 1000);
    });
    const overview = await scenario.load(allFilters, undefined, "summary");
    assert.equal(overview.status, "ok");
    assert.equal(overview.data.events.length, 5);
    assert.ok(overview.data.events.every((row: Row) => row.stage === "PAGE_VIEW"));
    assert.equal(overview.data.nextCursor, null);
    assert.equal(overview.data.summary.recordedActions, 1255);
    assert.equal(overview.data.summary.pagesVisited, 46);
    assert.deepEqual(overview.data.summary.searchProducts, { flights: 553, hotels: 552, cars: 0, other: 0 });
    for (const source of ["journey", "search", "handoff"]) {
      const reads = scenario.calls.filter(call => call.source === source);
      assert.equal(reads.length, 1, source + " history must not drain for a preview");
      assert.ok(reads.every(call => call.take <= 45));
    }
    const complete = await scenario.load();
    assert.deepEqual(overview.data.events, complete.data.events.slice(0, 5));
    assert.equal(overview.data.summary.recordedActions, complete.data.events.length);
  }
});

test("overview remains newest-first and its counts preserve exact search product fallbacks", async () => {
  const scenario = setup("guest", 6, ["FLIGHT", "HOTEL", "CAR"]);
  scenario.records.journeys[0].product = null;
  const complete = await scenario.load();
  const overview = await scenario.load({ ...allFilters, order: "oldest" }, undefined, "summary");
  assert.deepEqual(overview.data.events, complete.data.events.slice(0, 5));
  assert.deepEqual(overview.data.summary.searchProducts, { flights: 2, hotels: 2, cars: 2, other: 0 });
});

test("all retained edit, filter, sort, detail and provider-choice stages appear and count under their own category", async () => {
  const scenario = setup("guest", 1);
  const sample = scenario.records.journeys[0];
  const stages = ["SEARCH_EDIT_APPLIED", "SEARCH_FILTER_APPLIED", "SEARCH_SORT_CHANGED", "RESULT_DETAILS_OPENED", "RATE_DETAILS_OPENED",
    "FLIGHT_DETAILS_VIEWED", "PROVIDER_DEAL_SELECTED"];
  for (const [index, type] of stages.entries()) scenario.records.journeys.push({
    ...sample, id: "qa-retained-" + index, type, createdAt: new Date(+baseTime + (index + 1) * 1000),
  });
  const full = await scenario.load();
  assert.equal(full.status, "ok");
  assert.equal(full.data.summary.recordedActions, full.data.events.length);
  assert.equal(full.data.summary.searches, 1);
  assert.equal(full.data.summary.journeysTracked, 1);
  assert.equal(full.data.summary.offersSelected, 0);
  for (const stage of stages) {
    const category = stage === "PROVIDER_DEAL_SELECTED" ? "selections" : "searches";
    const result = await scenario.load({ ...allFilters, tab: category, stage }, undefined, "page");
    assert.equal(result.status, "ok", stage);
    assert.equal(result.data.events.length, 1, stage);
    assert.equal(result.data.events[0].stage, stage);
    assert.equal(result.data.summary.recordedActions, 1, stage);
    assert.equal(result.data.nextCursor, null, stage);
  }
});

test("text search matches the displayed edit, filter and sort action labels", async () => {
  const scenario = setup("guest", 1);
  const sample = scenario.records.journeys[0];
  for (const [index, [stage, label]] of [
    ["SEARCH_EDIT_APPLIED", "Search edit submitted"],
    ["SEARCH_FILTER_APPLIED", "Results filter applied"],
    ["SEARCH_SORT_CHANGED", "Results sort changed"],
  ].entries()) {
    scenario.records.journeys.push({ ...sample, id: "qa-label-search-" + index, type: stage });
    for (const q of [label, stage.replaceAll("_", " ")]) {
      const result = await scenario.load({ ...allFilters, tab: "searches", stage, q }, undefined, "page");
      assert.equal(result.status, "ok", q);
      assert.deepEqual(result.data.events.map((row: Row) => row.label), [label], q);
      assert.equal(result.data.summary.recordedActions, 1, q);
    }
  }
});

test("share filters find both linked and unlinked observations by their displayed action", async () => {
  const scenario = setup("guest", 1);
  const source = scenario.records.journeys[0];
  const canonical = { ...source, id: "qa-linked-share", type: "RESULT_SHARED",
    metadata: { environment: "staging", action: "share_sheet_requested" } };
  const direct = { ...scenario.records.analytics[0], id: "qa-unlinked-share", type: "SHARE", name: "share_sheet_requested",
    metadata: { environment: "staging", product: "FLIGHT" } };
  scenario.records.journeys.push(canonical);
  scenario.records.analytics.push(direct, { ...direct, id: "qa-direct-linked-duplicate", metadata: {
    ...direct.metadata, linkedJourneyId: source.journey.id, linkedSearchHistoryId: source.searchHistoryId,
  } });
  const result = await scenario.load({ ...allFilters, tab: "interactions", stage: "RESULT_SHARED", q: "Share sheet requested" }, undefined, "page");
  assert.equal(result.status, "ok");
  assert.equal(result.data.summary.recordedActions, 2);
  assert.deepEqual(result.data.events.map((row: Row) => row.id).sort(), ["e-qa-unlinked-share", "j-qa-linked-share"]);
  assert.ok(result.data.events.every((row: Row) => row.label === "Share sheet requested"));
});

test("the interactions tab excludes unrelated signup, support and provider-failure audits", async () => {
  const scenario = setup("user", 1);
  const sample = scenario.records.analytics[0];
  const related = [
    { type: "SAVE", name: "saved_item_confirmed", label: "Save confirmed" },
    { type: "SHARE", name: "share_link_copied", label: "Result link copied" },
    { type: "ALERT_CREATED", name: "price_alert_created", label: "Price alert enabled" },
  ];
  const unrelated = [
    { type: "SIGNUP", name: "password_signup", label: "Account signup" },
    { type: "SUPPORT_TICKET", name: "support_ticket_created", label: "Support ticket" },
    { type: "PROVIDER_FAILURE", name: "provider_issue", label: "Provider issue" },
  ];
  scenario.records.analytics.splice(0, scenario.records.analytics.length, ...[...related, ...unrelated].map(({ type, name }) => ({
    ...sample, id: "qa-account-event-" + name, type, name,
  })));
  const broad = await scenario.load({ ...allFilters, stage: "ACCOUNT_ACTIVITY" }, undefined, "page");
  assert.equal(broad.status, "ok");
  assert.equal(broad.data.summary.recordedActions, related.length + unrelated.length);
  assert.deepEqual(broad.data.events.map((row: Row) => row.label).sort(), [...related, ...unrelated].map(row => row.label).sort());
  const interactions = await scenario.load({ ...allFilters, tab: "interactions" }, undefined, "page");
  assert.equal(interactions.status, "ok");
  assert.equal(interactions.data.summary.recordedActions, related.length);
  assert.deepEqual(interactions.data.events.map((row: Row) => row.label).sort(), related.map(row => row.label).sort());
});

test("invalid canonical references preserve eligible guest and account legacy actions, counts and pages", async () => {
  for (const kind of ["guest", "user"] as const) {
    for (const source of ["search", "handoff"] as const) {
      const scenario = setup(kind, 31);
      const sample = scenario.records.journeys[0];
      const legacyRows = source === "search" ? scenario.records.searches : scenario.records.handoffs;
      const stage = source === "search" ? "SEARCH_COMPLETED" : "PROVIDER_HANDOFF_STARTED";
      if (source === "handoff") {
        for (const [index, handoff] of legacyRows.entries()) {
          const event = { ...sample, id: "qa-canonical-handoff-" + index, type: stage, createdAt: handoff.createdAt,
            searchHistoryId: null, searchHistory: null, redirectLogId: handoff.id, redirectLog: handoff };
          scenario.records.journeys.push(event);
          handoff.journeyEvents.push(event);
        }
      }
      const first = legacyRows[0].journeyEvents[0];
      const second = legacyRows[1].journeyEvents[0];
      const invalidate = (event: Row) => {
        if (source === "search") Object.assign(event, { redirectLogId: "qa-foreign-redirect",
          redirectLog: { ...scenario.records.handoffs[0], visitorId: "another-visitor" } });
        else Object.assign(event, { searchHistoryId: "qa-foreign-search",
          searchHistory: { ...scenario.records.searches[0], visitorId: "another-visitor" } });
      };
      invalidate(first);
      // An additional invalid event must not restore a duplicate when the same
      // legacy row also has an eligible valid canonical replacement.
      const invalidSecond = { ...second, id: "qa-extra-invalid-replacement" };
      invalidate(invalidSecond);
      scenario.records.journeys.push(invalidSecond);
      legacyRows[1].journeyEvents.push(invalidSecond);
      const filters = { ...allFilters, tab: source === "search" ? "searches" : "handoffs" };
      const total = source === "search" ? 31 : 53;
      const restoredId = (source === "search" ? "s-" : "r-") + legacyRows[0].id;
      const duplicateId = (source === "search" ? "s-" : "r-") + legacyRows[1].id;
      const overview = await scenario.load(filters, undefined, "summary");
      assert.equal(overview.status, "ok", kind + ":" + source);
      assert.equal(overview.data.events.length, 5);
      assert.equal(overview.data.summary.recordedActions, total);
      if (source === "search") assert.deepEqual(overview.data.summary.searchProducts, { flights: 16, hotels: 15, cars: 0, other: 0 });
      const complete = await scenario.load(filters);
      assert.equal(complete.status, "ok");
      assert.equal(complete.data.events.length, total);
      assert.equal(complete.data.summary.recordedActions, total);
      assert.ok(complete.data.events.some((row: Row) => row.id === restoredId));
      assert.ok(complete.data.events.every((row: Row) => row.id !== duplicateId && row.id !== "j-" + first.id && row.id !== "j-" + invalidSecond.id));
      const seen: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await scenario.load(filters, cursor, "page");
        assert.equal(page.status, "ok");
        assert.equal(page.data.summary.recordedActions, total);
        assert.equal(page.data.events.length, Math.min(20, total - seen.length));
        seen.push(...page.data.events.map((row: Row) => row.id));
        cursor = page.data.nextCursor ?? undefined;
      } while (cursor);
      assert.deepEqual(seen, complete.data.events.map((row: Row) => row.id));
      assert.equal(new Set(seen).size, total);
      assert.equal(scenario.calls.some(call => call.source === source && call.replacementValidation), kind === "user");
      assert.ok(scenario.calls.every(call => call.take <= 500));
    }
  }
});

test("a different visitor linked to the same account cannot replace the source visitor's legacy search", async () => {
  const scenario = setup("user", 1, ["FLIGHT"], false, "HOTEL", 2, 2);
  const event = scenario.records.journeys[0];
  const otherVisitorId = "qa-extra-visitor-000";
  event.journey = { ...event.journey, visitorId: otherVisitorId,
    visitor: { ...event.journey.visitor, id: otherVisitorId } };
  const result = await scenario.load({ ...allFilters, tab: "searches" }, undefined, "summary");
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data.events.map((row: Row) => row.id), ["s-" + scenario.records.searches[0].id]);
  assert.equal(result.data.summary.recordedActions, 1);
  assert.deepEqual(result.data.summary.searchProducts, { flights: 1, hotels: 0, cars: 0, other: 0 });
});

test("valid guest and account replacements keep overview reads bounded without fallback scans", async () => {
  for (const kind of ["guest", "user"] as const) {
    const scenario = setup(kind, 1105);
    const result = await scenario.load({ ...allFilters, tab: "searches" }, undefined, "summary");
    assert.equal(result.status, "ok");
    assert.equal(result.data.events.length, 5);
    assert.equal(result.data.summary.recordedActions, 1105);
    assert.ok(scenario.calls.every(call => !call.replacementValidation));
    assert.ok(scenario.calls.filter(call => call.source === "search" || call.source === "journey")
      .every(call => call.take <= 45));
  }
});

test("invalid canonical references cannot exhaust a raw page or enter exact counts", async () => {
  const scenario = setup("guest", 1);
  const sample = scenario.records.journeys[0];
  for (let index = 0; index < 90; index++) scenario.records.journeys.push({
    ...sample, id: "qa-invalid-" + String(index).padStart(3, "0"), createdAt: new Date(+baseTime + 1000),
    searchHistory: { ...sample.searchHistory, visitorId: "another-visitor" },
  });
  const result = await scenario.load({ ...allFilters, tab: "searches" }, undefined, "page");
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data.events.map((row: Row) => row.id), ["j-" + sample.id]);
  assert.equal(result.data.summary.recordedActions, 1);
  assert.equal(result.data.nextCursor, null);
  assert.equal(scenario.calls.filter(call => call.source === "journey").length, 3);
});

test("a failed refill rejects the whole page instead of returning a partial history", async () => {
  const scenario = setup("guest", 1);
  const sample = scenario.records.journeys[0];
  for (let index = 0; index < 45; index++) scenario.records.journeys.push({
    ...sample, id: "qa-invalid-" + String(index).padStart(3, "0"), createdAt: new Date(+baseTime + 1000),
    searchHistory: { ...sample.searchHistory, visitorId: "another-visitor" },
  });
  scenario.failNextBatch("journey");
  assert.deepEqual(await scenario.load({ ...allFilters, tab: "searches" }, undefined, "page"), { status: "unavailable" });
});

test("eligible page and exact-count scans reject non-advancing sources", async () => {
  const { readEligibleActivitySource, countEligibleActivitySource } = loadProduction("src/lib/adminIdentityActivityComplete.ts");
  const rows = Array.from({ length: 500 }, (_, index) => ({ id: "qa-row-" + index, createdAt: baseTime }));
  await assert.rejects(readEligibleActivitySource("e", async (_after: unknown, take: number) => rows.slice(0, take), () => false, 21), /did not advance/);
  await assert.rejects(countEligibleActivitySource("e", async () => rows, () => false), /did not advance/);
});

test("All activity consistently excludes passive access observations for accounts and both guest sources", async () => {
  for (const kind of ["user", "guest", "operational"] as const) {
    const scenario = setup(kind, 3);
    const result = await scenario.loadUnified();
    assert.equal(result.status, "ok", kind);
    assert.ok(result.data.events.every((row: Row) => !row.id.startsWith("d-")), kind);
    assert.equal(result.data.summary.recordedActions, kind === "operational" ? 56 : 107);
  }
});

const essentialActions = [
  { type: "SAVE", name: "saved_item_confirmed", stage: "RESULT_SAVED", key: "saved-audit:" },
  { type: "SAVE", name: "saved_item_removed", stage: "RESULT_UNSAVED", key: "saved-audit:" },
  { type: "ALERT_CREATED", name: "price_alert_created", stage: "PRICE_ALERT_CREATED", key: "price-alert:" },
];

function essentialAuditScenario(count = 3) {
  const scenario = setup("user", 1, ["FLIGHT"], false, "FLIGHT");
  scenario.records.handoffs.length = 0;
  scenario.records.analytics.length = 0;
  const search = scenario.records.searches[0];
  const searchEvent = scenario.records.journeys[0];
  const visitor = search.visitor;
  for (let index = 0; index < count; index++) {
    const action = essentialActions[index % essentialActions.length];
    const audit: Row = {
      id: "qa-essential-audit-" + String(index).padStart(6, "0"), userId: "qa-complete-account", visitorId: null, visitor: null,
      type: action.type, name: action.name, createdAt: new Date(+baseTime - Math.floor(index / 17) * 1000),
      metadata: { environment: "staging", product: "FLIGHT", applicationSource: "WEB", outcome: "confirmed",
        recordPurpose: "essential_account_audit", linkedJourneyId: searchEvent.journey.id, linkedSearchHistoryId: search.id },
    };
    const canonical: Row = { ...searchEvent, id: "qa-essential-canonical-" + String(index).padStart(6, "0"),
      eventKey: action.key + audit.id, type: action.stage, createdAt: new Date(+audit.createdAt + 60_000),
      metadata: { environment: "staging", action: action.name } };
    scenario.records.analytics.push(audit);
    scenario.records.journeys.push(canonical);
  }
  return { ...scenario, visitor, search, audits: scenario.records.analytics,
    canonical: scenario.records.journeys.slice(1) };
}

/** Run the current mutation writers and optional linkers, rather than inventing
 * a combination of Essential purpose and journey links that cannot occur. */
async function essentialWriterLinkerScenario() {
  const scenario = essentialAuditScenario(0);
  const { search, visitor } = scenario;
  const userId = "qa-complete-account";
  const runtimeRequire = createRequire(resolve("package.json"));
  const crypto = runtimeRequire("node:crypto");
  const requestId = crypto.randomUUID();
  const now = new Date();
  const query = { environment: "staging", departureDate: "2026-12-12", returnDate: "", tripType: "one-way",
    cabinClass: "economy", adults: 1, children: 0, infants: 0 };
  Object.assign(search, { requestId, createdAt: new Date(+now - 2000), origin: "LOS", destination: "LHR", query,
    checkIn: null, checkOut: null });
  const searchEvent = scenario.records.journeys[0];
  Object.assign(searchEvent, { journeyId: searchEvent.journey.id, createdAt: search.createdAt });
  const saved: Row[] = [];
  const alerts: Row[] = [];
  const account = { id: userId, email: "synthetic@example.test", role: "USER", status: "ACTIVE", emailVerified: now };
  const mutationDelegate = (rows: Row[], prefix: string) => ({
    async findMany({ where }: Row) { return rows.filter(row => matches(row, where)); },
    async findFirst({ where }: Row) { return rows.find(row => matches(row, where)) ?? null; },
    async create({ data }: Row) {
      const row = { id: prefix + rows.length, createdAt: new Date(), updatedAt: new Date(),
        status: "ACTIVE", lastSeenPrice: null, lastCheckedAt: null, ...data };
      rows.push(row); return row;
    },
    async deleteMany({ where }: Row) {
      const index = rows.findIndex(row => matches(row, where));
      if (index < 0) return { count: 0 };
      rows.splice(index, 1); return { count: 1 };
    },
  });
  const db: Row = {
    async $transaction(work: (tx: Row) => unknown) { return work(db); },
    async $executeRaw() { return 1; },
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      const sql = strings.join("?");
      if (sql.includes('FROM "User"')) return values[0] === userId ? [account] : [];
      if (sql.includes('FROM "Visitor"')) return values[0] === visitor.id ? [{ id: visitor.id }] : [];
      throw new Error("Unexpected writer/linker SQL");
    },
    visitor: { async findUnique({ where }: Row) { return matches(visitor, where) ? visitor : null; } },
    analyticsEvent: {
      async create({ data }: Row) {
        assert.equal(Object.hasOwn(data, "visitorId"), false, "Essential writer does not add a visitor");
        const row = { id: "qa-written-audit-" + scenario.audits.length, createdAt: new Date(), visitorId: null, visitor: null, ...data };
        scenario.audits.push(row); return row;
      },
      async findFirst({ where }: Row) {
        return scenario.audits.filter(row => matches(row, where))
          .sort((a, b) => +b.createdAt - +a.createdAt || b.id.localeCompare(a.id))[0] ?? null;
      },
      async update({ where, data }: Row) {
        assert.deepEqual(Object.keys(data), ["metadata"], "Linker only enriches audit metadata");
        const row = scenario.audits.find(row => matches(row, where));
        assert.ok(row); Object.assign(row, data); return row;
      },
    },
    journeyEvent: {
      async findUnique({ where }: Row) { return scenario.records.journeys.find(row => matches(row, where)) ?? null; },
      async findMany({ where }: Row) {
        return [...new Map(scenario.records.journeys.filter(row => matches(row, where))
          .map(row => [row.journeyId, { journeyId: row.journeyId }])).values()];
      },
      async create({ data }: Row) {
        const row = { ...searchEvent, id: "qa-written-canonical-" + scenario.records.journeys.length,
          createdAt: new Date(), ...data };
        scenario.records.journeys.push(row); return row;
      },
    },
    searchHistory: { async findUnique({ where }: Row) { return matches(search, where) ? search : null; } },
    savedFlight: mutationDelegate(saved, "qa-saved-flight-"), priceAlert: mutationDelegate(alerts, "qa-price-alert-"),
  };
  const overrides = {
    "server-only": {}, "node:crypto": crypto, "node:async_hooks": runtimeRequire("node:async_hooks"),
    "next/server": runtimeRequire("next/server"), zod: runtimeRequire("zod"),
    "@/lib/prisma": { getOptionalPrisma: () => db, getPrisma: () => db },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging",
      withEnvironmentMetadata: (metadata: Row) => ({ ...metadata, environment: "staging" }) },
    "@/services/requestActivityIdentity": {
      resolveRequestActivityIdentity: async () => ({ userId, visitorId: visitor.id, applicationSource: "WEB" }),
      resolveObservedActivityIdentity: async (request: Request) => ({ userId,
        visitorId: matchesBrowserActivityConfirmation(request, userId) ? visitor.id : null, applicationSource: "WEB" }),
    },
    "@/lib/feature-controls/service": { isFeatureEnabled: async (key: string) => { assert.equal(key, "PRICE_ALERTS_ENABLED"); return true; } },
  };
  const savedService = loadProduction("src/services/savedRecentService.ts", overrides);
  const interactions = loadProduction("src/app/api/activity/interactions/route.ts", overrides);
  const { analyticsConfirmationHeader, analyticsConfirmationVersion } = loadProduction("src/lib/visitor-consent-constants.ts");
  const { createVisitorToken, issueBrowserActivityConfirmation, matchesBrowserActivityConfirmation, visitorCookieName } = loadProduction("src/lib/visitor-identity.ts", overrides);
  const visitorToken = createVisitorToken();
  const url = "https://essential.fixture/api/activity/interactions";
  const { confirmation } = issueBrowserActivityConfirmation(new Request(url, {
    headers: { [analyticsConfirmationHeader]: analyticsConfirmationVersion },
  }), visitorToken, userId);
  const input = savedService.createSavedItemInputSchema.parse({ type: "flight", provider: "synthetic-partner",
    airlineName: "Synthetic Air", originAirport: "LOS", destinationAirport: "LHR",
    departureTime: "2026-12-12T10:00:00Z", arrivalTime: "2026-12-12T17:00:00Z", price: 100, currency: "USD",
    payload: { flightResultId: "synthetic-flight-offer" } });
  const item = await savedService.createSavedItemWriter(() => db, true)(userId, input, { applicationSource: "WEB" });
  for (const action of ["saved_item_confirmed", "saved_item_removed"]) {
    if (action === "saved_item_removed") await savedService.createSavedItemRemover(() => db)(userId, { type: "flight", id: item.id }, { applicationSource: "WEB" });
    const response = await interactions.POST(new Request(url, {
      method: "POST", headers: { "sec-fetch-site": "same-origin", "content-type": "application/json",
        cookie: visitorCookieName + "=" + visitorToken, [analyticsConfirmationHeader]: confirmation.proof },
      body: JSON.stringify({ action, product: "FLIGHT", resultId: "synthetic-flight-offer", requestId, eventId: crypto.randomUUID() }),
    }));
    assert.deepEqual(await response.json(), { accepted: true });
  }
  const alertService = loadProduction("src/services/priceTrackingService.ts", overrides);
  const alert = await alertService.createPriceAlert({ userId, type: "FLIGHT", origin: "LOS", destination: "LHR",
    targetPrice: 90, baselinePrice: 100, currency: "USD", mode: "TARGET", query });
  await loadProduction("src/services/priceAlertJourneyLinkService.ts", overrides).linkCreatedPriceAlertToJourney({
    alertId: alert.id, userId, visitorId: visitor.id, requestId,
  });
  assert.equal(scenario.audits.length, 3);
  for (const [index, audit] of scenario.audits.entries()) {
    assert.equal(audit.visitorId, null);
    assert.equal(audit.metadata.recordPurpose, "essential_account_audit");
    assert.equal(audit.metadata.outcome, "confirmed");
    assert.equal(audit.metadata.linkedJourneyId, searchEvent.journey.id);
    assert.equal(audit.metadata.linkedSearchHistoryId, search.id);
    assert.ok(scenario.records.journeys.some(row => row.eventKey === essentialActions[index].key + audit.id));
  }
  return scenario;
}

test("essential audit from the real save/remove/alert writers and linkers survives withdrawal exactly once", async () => {
  const scenario = await essentialWriterLinkerScenario();
  for (const withdrawn of [false, true]) {
    if (withdrawn) Object.assign(scenario.visitor, { consentStatus: "WITHDRAWN", trackingDisabledAt: new Date(), currentUserId: null, identityLinks: [] });
    for (const mode of ["all", "page", "summary"] as const) {
      const result = await scenario.load(allFilters, undefined, mode);
      assert.equal(result.status, "ok");
      assert.equal(result.data.summary.recordedActions, 4, mode + " withdrawn=" + withdrawn);
      assert.equal(result.data.events.length, 4);
      for (const audit of scenario.audits) assert.equal(result.data.events.some((row: Row) => row.id === "e-" + audit.id), withdrawn);
      assert.equal(result.data.events.filter((row: Row) => essentialActions.some(action => action.stage === row.stage)).length, withdrawn ? 0 : 3);
    }
  }
});

test("essential audit fallback stays direct-owner and does not change optional or legacy link suppression", async () => {
  const scenario = essentialAuditScenario(1);
  scenario.records.journeys.splice(1);
  const sample = scenario.audits[0];
  const invalid: Row[] = [
    { userId: "other-account" }, { userId: null, visitorId: scenario.visitor.id, visitor: scenario.visitor },
    { visitorId: scenario.visitor.id, visitor: scenario.visitor },
    { metadata: { ...sample.metadata, recordPurpose: "optional_analytics" } },
    { metadata: { ...sample.metadata, recordPurpose: undefined } },
    { metadata: { ...sample.metadata, outcome: "client_confirmed" } },
    { name: "local_saved" }, { type: "SHARE", name: "share_link_copied" },
    { type: "ALERT_CREATED", name: "price_alert_paused" },
  ];
  scenario.audits.push(...invalid.map((change, index) => ({ ...sample, id: "qa-excluded-audit-" + index, ...change })));
  const result = await scenario.load({ ...allFilters, tab: "interactions" });
  assert.equal(result.status, "ok");
  assert.deepEqual(result.data.events.map((row: Row) => row.id), ["e-" + sample.id]);
  assert.equal(result.data.summary.recordedActions, 1);
});

test("essential audit requires an exact eligible canonical replacement, not link strings alone", async () => {
  const cases: Array<[string, (scenario: ReturnType<typeof essentialAuditScenario>) => void]> = [
    ["absent", scenario => { scenario.records.journeys.splice(1); }],
    ["wrong event key", scenario => { scenario.canonical[0].eventKey = "saved-audit:another-audit"; }],
    ["wrong action", scenario => { scenario.canonical[0].type = "RESULT_UNSAVED"; }],
    ["wrong journey", scenario => { scenario.audits[0].metadata.linkedJourneyId = "another-journey"; }],
    ["wrong search", scenario => { scenario.audits[0].metadata.linkedSearchHistoryId = "another-search"; }],
    ["missing source", scenario => { scenario.canonical[0].searchHistory = null; }],
    ["foreign account", scenario => { scenario.canonical[0].searchHistory = { ...scenario.search, userId: "other-account" }; }],
    ["another linked visitor", scenario => { scenario.canonical[0].searchHistory = { ...scenario.search, visitorId: "another-linked-visitor" }; }],
    ["foreign event environment", scenario => { scenario.canonical[0].metadata.environment = "production"; }],
    ["foreign source environment", scenario => { scenario.canonical[0].searchHistory = { ...scenario.search, query: { environment: "production" } }; }],
  ];
  for (const [name, mutate] of cases) {
    const scenario = essentialAuditScenario(1);
    mutate(scenario);
    const result = await scenario.load({ ...allFilters, tab: "interactions" });
    assert.equal(result.status, "ok", name);
    assert.ok(result.data.events.some((row: Row) => row.id === "e-" + scenario.audits[0].id), name);
    assert.equal(result.data.summary.recordedActions, result.data.events.length, name);
  }
});

test("essential audit fallback survives disabled or reassigned visitors without revealing their optional actions", async () => {
  const states = [
    { consentStatus: "WITHDRAWN" }, { trackingDisabledAt: baseTime },
    { currentUserId: "other-account" }, { identityLinks: [{ userId: "qa-complete-account" }, { userId: "other-account" }] },
    { currentUser: { status: "SUSPENDED", emailVerified: baseTime } },
  ];
  for (const state of states) {
    const scenario = essentialAuditScenario();
    Object.assign(scenario.visitor, state);
    const result = await scenario.load({ ...allFilters, tab: "interactions" });
    assert.equal(result.status, "ok");
    assert.equal(result.data.summary.recordedActions, 3);
    assert.ok(result.data.events.every((row: Row) => row.stage === "ACCOUNT_ACTIVITY"));
  }
});

test("essential audit replacement follows the active period, product, action and text filters", async () => {
  const scenario = essentialAuditScenario();
  const cases: Array<[Row, number, string[]]> = [
    [{ stage: "ACCOUNT_ACTIVITY" }, 3, ["ACCOUNT_ACTIVITY"]],
    [{ stage: "RESULT_SAVED" }, 1, ["RESULT_SAVED"]],
    [{ q: "Save confirmed" }, 1, ["ACCOUNT_ACTIVITY"]],
    [{ q: "Unsaved item" }, 1, ["ACCOUNT_ACTIVITY"]],
    [{ product: "HOTEL" }, 0, []],
    [{ product: "FLIGHT" }, 3, ["RESULT_SAVED", "RESULT_UNSAVED", "PRICE_ALERT_CREATED"]],
    [{ from: new Date(+baseTime - 1000).toISOString(), to: new Date(+baseTime + 1000).toISOString() }, 3, ["ACCOUNT_ACTIVITY"]],
  ];
  for (const [filter, expected, stages] of cases) {
    for (const mode of ["all", "page", "summary"] as const) {
      const result = await scenario.load({ ...allFilters, tab: "interactions", ...filter }, undefined, mode);
      assert.equal(result.status, "ok", JSON.stringify(filter));
      assert.equal(result.data.summary.recordedActions, expected, JSON.stringify(filter));
      assert.equal(result.data.events.length, expected);
      assert.ok(result.data.events.every((row: Row) => stages.includes(row.stage)));
    }
  }
});

test("essential audit page boundaries and exact counts share bounded snapshot replacement evidence", async () => {
  const scenario = essentialAuditScenario(521);
  // Half have current canonical events; the rest retain only the real audit.
  scenario.records.journeys.splice(1, 521, ...scenario.canonical.filter((_, index) => index % 2 === 0));
  for (const order of ["newest", "oldest"]) {
    const filters = { ...allFilters, tab: "interactions", order };
    const complete = await scenario.load(filters);
    assert.equal(complete.status, "ok");
    assert.equal(complete.data.summary.recordedActions, 521);
    assert.equal(complete.data.events.length, 521);
    const expected = complete.data.events.map((row: Row) => row.id);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await scenario.load(filters, cursor, "page");
      assert.equal(page.status, "ok");
      assert.equal(page.data.summary.recordedActions, 521);
      assert.ok(page.data.events.length > 0 && page.data.events.length <= 20);
      seen.push(...page.data.events.map((row: Row) => row.id));
      cursor = page.data.nextCursor ?? undefined;
    } while (cursor);
    assert.deepEqual(seen, expected, order);
    assert.equal(new Set(seen).size, 521);
  }
  const overview = await scenario.load({ ...allFilters, tab: "interactions" }, undefined, "summary");
  assert.equal(overview.status, "ok");
  assert.equal(overview.data.summary.recordedActions, 521);
  assert.equal(overview.data.events.length, 5);
  const replacements = scenario.calls.filter(call => call.auditReplacement);
  const batches = scenario.calls.filter(call => call.source === "analytics");
  assert.ok(replacements.length > 0 && replacements.length <= batches.length, "One indexed lookup per analytics batch, never per action");
  for (const query of replacements) {
    assert.ok(query.inSnapshot);
    assert.ok(query.take <= 500);
    assert.equal(query.skip, undefined);
    assert.ok(!/"(?:lt|lte|gt|gte)":/.test(JSON.stringify(query.where)), "Unfiltered replacement query must not inherit a page cursor");
  }
});

test("essential audit replacement read failure returns unavailable rather than guessed duplicate history", async () => {
  const scenario = essentialAuditScenario(1);
  scenario.failAuditReplacement();
  assert.deepEqual(await scenario.load({ ...allFilters, tab: "interactions" }), { status: "unavailable" });
});

test("registered optional interactions stop contributing rows and totals after consent withdrawal", async () => {
  const { records, load } = setup("user", 0);
  const template = records.analytics[0];
  const visitor = template.visitor;
  records.analytics.splice(0, records.analytics.length,
    { ...template, id: "qa-registered-share", type: "SHARE", name: "share_link_copied",
      metadata: { environment: "staging", recordPurpose: "optional_analytics" } },
    { ...template, id: "qa-registered-local-save", type: "SAVE", name: "local_saved",
      metadata: { environment: "staging" } },
    { ...template, id: "qa-established-save", visitorId: null, visitor: null, type: "SAVE", name: "saved_item_confirmed",
      metadata: { environment: "staging", recordPurpose: "essential_account_audit" } },
  );
  const filters = { ...allFilters, tab: "interactions" };
  for (const mode of ["all", "page", "summary"] as const) {
    const before = await load(filters, undefined, mode);
    assert.equal(before.status, "ok");
    assert.equal(before.data.summary.recordedActions, 3);
  }
  Object.assign(visitor, { consentStatus: "WITHDRAWN", trackingDisabledAt: baseTime, currentUserId: null, identityLinks: [] });
  for (const mode of ["all", "page", "summary"] as const) {
    const after = await load(filters, undefined, mode);
    assert.equal(after.status, "ok");
    assert.equal(after.data.summary.recordedActions, 1);
    assert.deepEqual(after.data.events.map((row: Row) => row.id), ["e-qa-established-save"]);
  }
});

test("page writer rejects unlinked registered visitors and keeps the original actor through retries", async () => {
  const runtimeRequire = createRequire(import.meta.url);
  const visitor: Row = { currentUserId: null, identityLinks: [], consentStatus: "GRANTED", trackingDisabledAt: null };
  const account = { id: "qa-page-account", role: "ADMIN", status: "ACTIVE", emailVerified: baseTime };
  const identity: Row = { userId: account.id, visitorId: "qa-page-visitor", applicationSource: "WEB" };
  const rows: Row[] = [];
  const tx = {
    async $queryRaw(query: TemplateStringsArray, ...values: string[]) {
      const sql = query.join("");
      if (sql.includes('FROM "User"')) return [account];
      if (sql.includes('FROM "AnalyticsEvent"')) {
        const [eventId, visitorId, environment] = values;
        return rows.filter(row => row.visitorId === visitorId && row.metadata.eventId === eventId
          && row.metadata.environment === environment);
      }
      return [];
    },
    visitor: { async findUnique() { return visitor; } },
    analyticsEvent: {
      async create({ data }: Row) {
        if (rows.some(row => row.metadata.eventId === data.metadata.eventId)) throw Object.assign(new Error("Unique event ID"), { code: "P2002" });
        rows.push({ ...data, id: "qa-page-" + rows.length });
      },
    },
  };
  let pending = Promise.resolve<unknown>(undefined);
  const db = {
    $transaction<T>(action: (transaction: typeof tx) => Promise<T>) {
      const result = pending.then(() => action(tx));
      pending = result.catch(() => undefined);
      return result;
    },
  };
  const overrides = {
    "next/server": runtimeRequire("next/server"), zod: runtimeRequire("zod"), "node:crypto": runtimeRequire("node:crypto"),
    "@/lib/prisma": { getOptionalPrisma: () => db },
    "@/lib/guestAccessObservation": { consentedGuestAccessObservation: () => undefined },
    "@/lib/stagingSafety": { getPublicEnvironment: () => "staging",
      withEnvironmentMetadata: (metadata: Row) => ({ ...metadata, environment: "staging" }) },
    "@/services/requestActivityIdentity": {
      resolveRequestActivityIdentity: async () => ({ ...identity }),
      resolveObservedActivityIdentity: async (request: Request) => ({ ...identity,
        visitorId: matchesBrowserActivityConfirmation(request, identity.userId) ? identity.visitorId : null }),
    },
  };
  const { POST } = loadProduction("src/app/api/activity/page-views/route.ts", overrides);
  const { analyticsConfirmationHeader, analyticsConfirmationVersion } = loadProduction("src/lib/visitor-consent-constants.ts");
  const { createVisitorToken, issueBrowserActivityConfirmation, matchesBrowserActivityConfirmation, visitorCookieName } = loadProduction("src/lib/visitor-identity.ts", overrides);
  const visitorToken = createVisitorToken();
  const url = "https://pages.fixture/api/activity/page-views";
  const send = async (eventId: string, extra?: Row, confirmedUserId = identity.userId) => {
    const { confirmation } = issueBrowserActivityConfirmation(new Request(url, {
      headers: { [analyticsConfirmationHeader]: analyticsConfirmationVersion },
    }), visitorToken, confirmedUserId);
    const response = await POST(new Request(url, {
      method: "POST", headers: { "sec-fetch-site": "same-origin", "content-type": "application/json",
        cookie: visitorCookieName + "=" + visitorToken, [analyticsConfirmationHeader]: confirmation.proof },
      body: JSON.stringify({ eventId, pageKey: "home", ...extra }),
    }));
    return { status: response.status, ...await response.json() };
  };

  const guestEventId = crypto.randomUUID();
  assert.equal((await send(guestEventId)).accepted, false);
  assert.equal(rows.length, 0);

  identity.userId = null;
  assert.equal((await send(guestEventId)).accepted, true);
  assert.equal(rows[0].userId, null);
  assert.equal(rows[0].metadata.originalIdentity, "guest");

  Object.assign(visitor, { currentUserId: account.id, identityLinks: [{ userId: account.id }] });
  identity.userId = account.id;
  assert.equal((await send(crypto.randomUUID(), undefined, null)).accepted, false);
  assert.equal((await send(guestEventId)).accepted, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].metadata.originalIdentity, "guest");

  const accountEventId = crypto.randomUUID();
  const duplicates = await Promise.all(Array.from({ length: 5 }, () => send(accountEventId)));
  assert.ok(duplicates.every(result => result.accepted));
  assert.equal(rows.length, 2);
  assert.equal(rows[1].userId, account.id);
  assert.equal(rows[1].metadata.originalIdentity, "registered");
  assert.equal(rows[1].metadata.interface, "customer");
  assert.equal((await send(crypto.randomUUID(), { userId: "qa-customer-subject" })).status, 400);
  assert.equal((await send(crypto.randomUUID(), { pageKey: "admin_users" })).status, 400);
  assert.equal((await send(crypto.randomUUID(), { previousPageKey: "notifications" })).status, 400);
  identity.visitorId = "qa-other-visitor";
  assert.deepEqual(await send(accountEventId), { status: 409, accepted: false, retryable: false });
  identity.visitorId = "qa-page-visitor";

  Object.assign(visitor, { consentStatus: "WITHDRAWN", trackingDisabledAt: baseTime });
  assert.equal((await send(crypto.randomUUID())).accepted, false);
  assert.equal(rows.length, 2);
});

test("admin role audit keeps the verified actor separate from the route subject", async () => {
  const runtimeRequire = createRequire(import.meta.url);
  const actor = { id: "qa-admin-actor", email: "actor@example.invalid" };
  const target = { id: "qa-affected-account", email: "subject@example.invalid", role: "ADMIN", status: "ACTIVE" };
  let authorized = false;
  let reads = 0;
  const audits: Row[] = [];
  const { PATCH } = loadProduction("src/app/api/admin/users/[id]/role/route.ts", {
    "next/server": runtimeRequire("next/server"),
    "@/lib/admin": {
      requireAdminApiSession: async () => authorized ? { session: { user: actor } } : { response: new Response(null, { status: 403 }) },
      isProtectedAdminEmail: () => false,
      countActiveAdminsExcluding: async () => 1,
      writeAdminAuditLog: async (entry: Row) => { audits.push(entry); },
    },
    "@/lib/prisma": { getPrisma: () => ({ user: {
      async findUnique({ where }: Row) { reads++; assert.equal(where.id, target.id); return target; },
      async update({ where, data }: Row) { assert.equal(where.id, target.id); return { ...target, role: data.role }; },
    } }) },
  });
  const send = () => PATCH(new Request("https://admin.fixture/api/admin/users/subject/role", {
    method: "PATCH", body: JSON.stringify({ role: "USER", adminUserId: target.id }),
  }), { params: Promise.resolve({ id: target.id }) });
  assert.equal((await send()).status, 403);
  assert.equal(reads, 0);
  assert.equal(audits.length, 0);
  authorized = true;
  assert.equal((await send()).status, 200);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].adminUserId, actor.id);
  assert.equal(audits[0].targetId, target.id);
  assert.equal(audits[0].action, "USER_ROLE_UPDATED");
});
