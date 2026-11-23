import assert from "node:assert/strict";
import test from "node:test";

import { createAdminSearchScopedActivityReader } from "./adminSearchScopedActivityCore";

const searchId = "search_123456";
const env = "staging" as const;
const urlParams = (cursor?: string) => new URLSearchParams({
  environment: env,
  ...(cursor ? { cursor } : {}),
});

function searchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: searchId, requestId: "request_00001", type: "FLIGHT",
    userId: null, visitorId: "guest_00001",
    visitor: { consentStatus: "GRANTED", trackingDisabledAt: null },
    ...overrides,
  };
}
function eventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "event_000001", type: "RESULTS_VIEWED", product: "FLIGHT",
    provider: "Duffel", redirectLogId: null, redirectLog: null,
    createdAt: new Date("2026-11-16T12:34:00.000Z"),
    ...overrides,
  };
}

function reader(input: {
  authorized?: boolean;
  activeEnvironment?: "staging" | "production";
  search?: ReturnType<typeof searchRow> | null;
  events?: Array<ReturnType<typeof eventRow>>;
  fail?: boolean;
} = {}) {
  let searchQuery: unknown = null;
  let eventQuery: unknown = null;
  let databaseCalls = 0;
  const read = createAdminSearchScopedActivityReader({
    authorize: async () => input.authorized !== false,
    environment: () => input.activeEnvironment ?? env,
    database: () => {
      databaseCalls++;
      return {
        searchHistory: {
          findFirst: async (args: unknown) => {
            searchQuery = args;
            if (input.fail) throw new Error("simulated read failure");
            return input.search === undefined ? searchRow() : input.search;
          },
        },
        journeyEvent: {
          findMany: async (args: unknown) => {
            eventQuery = args;
            return input.events ?? [];
          },
        },
      } as never;
    },
  });
  return {
    read,
    inspected: () => ({ searchQuery, eventQuery, databaseCalls }),
  };
}

test("authorization precedes even invalid query input and database access", async () => {
  const instance = reader({ authorized: false });
  const result = await instance.read("invalid", new URLSearchParams({ evil: "yes" }));
  assert.equal(result.status, "forbidden");
  assert.equal(instance.inspected().databaseCalls, 0);
});

test("rejects unrecognized filters and keeps the environment bound to one search", async () => {
  const instance = reader();
  assert.equal((await instance.read(searchId, new URLSearchParams({ environment: env, userId: "victim" }))).status, "invalid");
  assert.equal((await instance.read(searchId, new URLSearchParams({ environment: env, environment2: "production" }))).status, "invalid");
  assert.equal((await instance.read(searchId, new URLSearchParams({ environment: env, cursor: "tampered" }))).status, "invalid");
  assert.equal((await instance.read(searchId, new URLSearchParams([["environment", env], ["environment", "production"]]))).status, "invalid");
  assert.equal(instance.inspected().databaseCalls, 0);
});

test("cross-environment activity cannot query or expose another deployment's sessions", async () => {
  const instance = reader({ activeEnvironment: "production" });
  assert.deepEqual(await instance.read(searchId, urlParams()), {
    status: "ok", data: { events: [], nextCursor: null, searchOnly: true },
  });
  assert.equal(instance.inspected().databaseCalls, 0);
});

test("operational guest with no consented visitor has only the already-visible search milestone", async () => {
  const instance = reader({ search: searchRow({ visitorId: null, visitor: null, userId: null }) });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.data.searchOnly, true);
    assert.deepEqual(result.data.events, []);
  }
  assert.equal(instance.inspected().eventQuery, null);
  assert.deepEqual((instance.inspected().searchQuery as { where: unknown }).where, {
    id: searchId, query: { path: ["environment"], equals: env },
  });
});

test("consent withdrawal hides journey events rather than mislabeling them as absent searches", async () => {
  for (const visitor of [
    { consentStatus: "WITHDRAWN", trackingDisabledAt: null },
    { consentStatus: "GRANTED", trackingDisabledAt: new Date("2026-11-15T00:00:00.000Z") },
  ]) {
    const instance = reader({ search: searchRow({ visitor }) });
    const result = await instance.read(searchId, urlParams());
    assert.equal(result.status, "ok");
    if (result.status === "ok") assert.equal(result.data.searchOnly, true);
    assert.equal(instance.inspected().eventQuery, null);
  }
});

test("guest events require the exact search ID, consented unlinked visitor, and deployment environment", async () => {
  const instance = reader({ events: [eventRow()] });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.deepEqual(result.data.events.map(e => e.stage), ["RESULTS_VIEWED"]);
    assert.equal(result.data.events[0].provider, "Duffel");
    assert.equal(result.data.nextCursor, null);
  }
  const where = (instance.inspected().eventQuery as { where: Record<string, unknown> }).where;
  assert.equal(where.searchHistoryId, searchId);
  assert.deepEqual(where.metadata, { path: ["environment"], equals: env });
  const journey = where.journey as { is: { visitorId: string; visitor: { is: Record<string, unknown> } } };
  assert.equal(journey.is.visitorId, "guest_00001");
  assert.equal(journey.is.visitor.is.consentStatus, "GRANTED");
  assert.equal(journey.is.visitor.is.currentUserId, null);
  assert.deepEqual(journey.is.visitor.is.identityLinks, { none: {} });
  assert.equal(JSON.stringify(where).includes("request_00001"), true);
});

test("distinct native flight actions retain exact stage and only safe recorded offer references", async () => {
  const instance = reader({
    events: [
      eventRow({ id: "event_details", type: "FLIGHT_DETAILS_VIEWED", provider: "KAYAK sandbox",
        metadata: { resultId: "flight:112" } }),
      eventRow({ id: "event_fare", type: "OFFER_SELECTED", metadata: { resultId: "fare-2" } }),
      eventRow({ id: "event_deal", type: "PROVIDER_DEAL_SELECTED", provider: "Trip.com",
        metadata: { resultId: "deal_003" } }),
      eventRow({ id: "event_bad", type: "PROVIDER_DEAL_SELECTED", metadata: { resultId: "https://secret.test?token=private" } }),
    ],
  });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(result.data.events.map(event => event.stage),
    ["FLIGHT_DETAILS_VIEWED", "OFFER_SELECTED", "PROVIDER_DEAL_SELECTED", "PROVIDER_DEAL_SELECTED"]);
  assert.deepEqual(result.data.events.map(event => event.offerReference),
    ["flight:112", "fare-2", "deal_003", null]);
  assert.doesNotMatch(JSON.stringify(result), /secret\.test|private/);
  const conditions = JSON.stringify((instance.inspected().eventQuery as {where:unknown}).where);
  assert.match(conditions, /FLIGHT_DETAILS_VIEWED/);
  assert.match(conditions, /PROVIDER_DEAL_SELECTED/);
});

test("registered search requires verified active exclusive account linkage, not a guest directory lookup", async () => {
  const instance = reader({
    search: searchRow({ userId: "account_00001" }),
    events: [eventRow({ id: "event_000002", type: "OFFER_SELECTED" })],
  });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  const where = (instance.inspected().eventQuery as { where: Record<string, unknown> }).where;
  const eligible = (where.journey as { is: { visitor: { is: Record<string, unknown> } } }).is.visitor.is;
  assert.equal(eligible.currentUserId, "account_00001");
  assert.equal(JSON.stringify(eligible).includes("ACTIVE"), true);
  assert.equal(JSON.stringify(eligible).includes("emailVerified"), true);
  assert.equal(JSON.stringify(eligible).includes("account_00001"), true);
});

test("unverified or contradictory provider handoffs never appear as selected-search events", async () => {
  const instance = reader({
    events: [
      eventRow({ id: "event_000001", type: "PROVIDER_HANDOFF_STARTED", redirectLogId: "redirect_00001",
        redirectLog: { provider: "Kayak" }, provider: "Duffel" }),
      eventRow({ id: "event_000002", type: "OFFER_SELECTED", product: "HOTEL" }),
      eventRow({ id: "event_000003", type: "RESULTS_VIEWED", provider: "Duf\u0000fel" }),
    ],
  });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.deepEqual(result.data.events.map(event => event.id), ["event_000003"]);
    assert.equal(result.data.events[0].provider, "Duf fel");
  }
});

test("consented CAR search includes only exactly correlated car handoff", async () => {
  const instance = reader({
    search: searchRow({ type: "CAR" }),
    events: [eventRow({
      type: "PROVIDER_HANDOFF_STARTED", product: "CAR",
      redirectLogId: "redirect_car01", redirectLog: { provider: "Kayak" }, provider: "Kayak",
    })],
  });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status === "ok") assert.deepEqual(result.data.events.map(event => event.stage), ["PROVIDER_HANDOFF_STARTED"]);
  const where = (instance.inspected().eventQuery as { where: unknown }).where;
  assert.match(JSON.stringify(where), /"type":"CAR"/);
  assert.match(JSON.stringify(where), /"requestId"/);
});

test("verified provider handoff includes bounded recorded route and price, not destination URL", async () => {
  const instance = reader({
    events: [eventRow({
      type: "PROVIDER_HANDOFF_STARTED", redirectLogId: "redirect_handoff_01",
      redirectLog: {
        provider: "Duffel", route: "ABV → ACC", price: { toString: () => "412.00" },
        currency: "USD", destinationUrl: "https://example.test/?token=private",
      }, provider: "Duffel",
    })],
  });
  const result = await instance.read(searchId, urlParams());
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.deepEqual(result.data.events[0].handoff, {
      route: "ABV → ACC", price: "412.00", currency: "USD",
    });
    assert.doesNotMatch(JSON.stringify(result), /example\.test|token=private/);
  }
});

test("pagination stays bound to the same search and environment", async () => {
  const events = Array.from({ length: 26 }, (_, index) => eventRow({
    id: "event_" + String(index).padStart(6, "0"),
    createdAt: new Date(Date.parse("2026-11-16T12:34:00.000Z") + index * 1_000),
  }));
  const instance = reader({ events });
  const first = await instance.read(searchId, urlParams());
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  assert.equal(first.data.events.length, 25);
  assert.ok(first.data.nextCursor);
  const second = await instance.read(searchId, urlParams(first.data.nextCursor!));
  assert.equal(second.status, "ok");
  const other = await instance.read("search_other_0001", urlParams(first.data.nextCursor!));
  assert.equal(other.status, "invalid");
  const different = await instance.read(searchId, new URLSearchParams({
    environment: "production", cursor: first.data.nextCursor!,
  }));
  assert.equal(different.status, "invalid");
  const cursorWhere = (instance.inspected().eventQuery as { where: { AND: Array<unknown> } }).where;
  assert.equal(JSON.stringify(cursorWhere.AND).includes("2026-11-16T12:34:24.000Z"), true);
});

test("unavailable database returns unavailable rather than an invented empty activity history", async () => {
  const instance = reader({ fail: true });
  assert.equal((await instance.read(searchId, urlParams())).status, "unavailable");
  const missing = reader({ search: null });
  assert.equal((await missing.read(searchId, urlParams())).status, "not_found");
});
