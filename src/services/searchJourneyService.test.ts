import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createSearchJourneyService, type SearchJourneyDatabase, type SearchHistoryInput } from "./searchJourneyService";

import {
  getJourneyActivityCutoff,
  journeyEventKey,
} from "../lib/search-journey";

test("journey event keys are namespaced for idempotency", () => {
  assert.equal(journeyEventKey("search", "request-1"), "search:request-1");
  assert.equal(journeyEventKey("client", "request-1"), "client:request-1");
  assert.notEqual(journeyEventKey("search", "request-1"), journeyEventKey("client", "request-1"));
});

test("journey activity expires after thirty minutes of inactivity", () => {
  const now = new Date("2026-10-22T10:00:00.000Z");
  assert.equal(getJourneyActivityCutoff(now).toISOString(), "2026-10-22T09:30:00.000Z");
});

type Visitor = { id: string; consentStatus: string; trackingDisabledAt: Date | null; currentUserId: string | null; identityLinks: Array<{ userId: string }> };
type History = { id: string; visitorId: string | null; userId: string | null; requestId: string; type: "FLIGHT" | "HOTEL"; resultCount: number; latencyMs: number; status: "SUCCESS" | "PARTIAL" | "FAILED"; query: unknown };
type Journey = { id: string; visitorId: string; startedAt: Date; lastActivityAt: Date };
type Event = { journeyId: string; eventKey: string; type: string; searchHistoryId: string | null; redirectLogId: string | null; provider: string | null };

function fixture() {
  const visitors: Visitor[] = [];
  const histories: History[] = [];
  const journeys: Journey[] = [];
  const events: Event[] = [];
  const tails = new Map<string, Promise<void>>();
  let currentTime = new Date("2026-10-22T10:00:00Z");
  let onLock = () => {};
  async function acquire(key: string) {
    const previous = tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const tail = new Promise<void>(resolve => { release = resolve; });
    tails.set(key, previous.then(() => tail));
    await previous;
    return release;
  }
  function transaction(releases: Array<() => void>) {
    const lockedVisitors = new Set<string>();
    return {
      async $queryRaw(query: TemplateStringsArray, visitorId: string) {
        assert.match(query.join("?"), /FOR UPDATE/);
        releases.push(await acquire(`visitor:${visitorId}`));
        lockedVisitors.add(visitorId);
        onLock();
        return [{ id: visitorId }];
      },
      async $executeRaw(query: TemplateStringsArray, requestId: string) {
        assert.match(query.join("?"), /search-history-request/);
        releases.push(await acquire(`request:${requestId}`));
        return 1;
      },
      visitor: {
        async findUnique({ where }: { where: { id: string } }) {
          assert.ok(lockedVisitors.has(where.id), "consent must be rechecked after obtaining the write lock");
          return structuredClone(visitors.find(row => row.id === where.id) ?? null);
        },
      },
      searchHistory: {
        async findUnique({ where }: { where: { id?: string; requestId?: string } }) {
          return structuredClone(histories.find(row => where.id ? row.id === where.id : row.requestId === where.requestId) ?? null);
        },
        async create({ data }: { data: Omit<History, "id"> }) {
          assert.ok(!histories.some(row => row.requestId && row.requestId === data.requestId), "request IDs stay unique");
          const row = { ...data, id: `history-${histories.length + 1}` };
          histories.push(row);
          return structuredClone(row);
        },
        async update({ where, data }: { where: { id: string }; data: Partial<History> }) {
          const row = histories.find(item => item.id === where.id)!;
          Object.assign(row, data);
          return structuredClone(row);
        },
      },
      redirectLog: { async findUnique() { return null; } },
      searchJourney: {
        async findFirst({ where }: { where: { visitorId: string; lastActivityAt: { gte: Date } } }) {
          return journeys.filter(row => row.visitorId === where.visitorId && row.lastActivityAt >= where.lastActivityAt.gte)
            .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())[0] ?? null;
        },
        async create({ data }: { data: Omit<Journey, "id"> }) {
          assert.ok(lockedVisitors.has(data.visitorId));
          const row = { ...data, id: `journey-${journeys.length + 1}` };
          journeys.push(row);
          return { id: row.id };
        },
        async update({ where, data }: { where: { id: string }; data: { lastActivityAt: Date } }) {
          const row = journeys.find(item => item.id === where.id)!;
          assert.ok(lockedVisitors.has(row.visitorId));
          row.lastActivityAt = data.lastActivityAt;
          return { id: row.id };
        },
      },
      journeyEvent: {
        async findUnique({ where }: { where: { eventKey: string } }) {
          const event = events.find(row => row.eventKey === where.eventKey);
          return event ? { ...event, journey: { visitorId: journeys.find(row => row.id === event.journeyId)!.visitorId } } : null;
        },
        async create({ data }: { data: Event }) {
          assert.ok(!events.some(row => row.eventKey === data.eventKey), "an event key is persisted once");
          const row = { ...data, searchHistoryId: data.searchHistoryId ?? null, redirectLogId: data.redirectLogId ?? null, provider: data.provider ?? null };
          events.push(row);
          return row;
        },
      },
    };
  }
  const db = {
    async $transaction<T>(callback: (tx: ReturnType<typeof transaction>) => Promise<T>) {
      const releases: Array<() => void> = [];
      try { return await callback(transaction(releases)); }
      finally { releases.reverse().forEach(release => release()); }
    },
  };
  function visitor(id = `visitor-${visitors.length + 1}`, userId: string | null = null) {
    const row: Visitor = { id, consentStatus: "GRANTED", trackingDisabledAt: null, currentUserId: userId, identityLinks: userId ? [{ userId }] : [] };
    visitors.push(row);
    return row;
  }
  function search(visitorId: string | null, requestId: string = randomUUID(), userId: string | null = null) {
    const row: History = { id: `history-${histories.length + 1}`, visitorId, userId, requestId, type: "FLIGHT", resultCount: 5, latencyMs: 1, status: "SUCCESS", query: {} };
    histories.push(row);
    return row;
  }
  return { service: createSearchJourneyService(() => db as unknown as SearchJourneyDatabase, () => currentTime),
    visitor, search, visitors, histories, journeys, events,
    setTime: (value: Date) => { currentTime = value; }, onLock: (value: () => void) => { onLock = value; } };
}
function client(visitorId: string, requestId: string) {
  return { visitorId, userId: null, eventId: randomUUID(), requestId, type: "RESULTS_VIEWED" as const };
}

test("a valid visitor may retry deferred history, but no event is persisted before ownership exists", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const event = client(visitor.id, randomUUID());
  assert.deepEqual(await f.service.recordClientJourneyEvent(event), { accepted: false, retryable: true });
  assert.equal(f.events.length, 0);
  f.search(visitor.id, event.requestId);
  assert.deepEqual(await f.service.recordClientJourneyEvent(event), { accepted: true });
  assert.equal(f.events.length, 1);
});

test("stale resolved identities are rejected if withdrawal commits before the event write", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const search = f.search(visitor.id);
  f.onLock(() => { visitor.consentStatus = "WITHDRAWN"; visitor.trackingDisabledAt = new Date(); });
  assert.deepEqual(await f.service.recordClientJourneyEvent(client(visitor.id, search.requestId)), { accepted: false });
  assert.equal(await f.service.recordJourneyEvent({ visitorId: visitor.id, type: "SEARCH_COMPLETED", eventKey: `search:${search.id}`, searchHistoryId: search.id }), null);
  assert.equal(f.events.length, 0);
  assert.equal(f.journeys.length, 0);
});

test("linked visitors require their validated account and reject mixed historical ownership", async () => {
  const f = fixture();
  const visitor = f.visitor("linked", "account-a");
  const search = f.search(visitor.id, randomUUID(), "account-a");
  const event = client(visitor.id, search.requestId);
  for (const userId of [null, "account-b"]) assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, userId }), { accepted: false });
  assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, userId: "account-a" }), { accepted: true });
  visitor.identityLinks.push({ userId: "account-b" });
  assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, eventId: randomUUID(), userId: "account-a" }), { accepted: false });
  assert.equal(f.events.length, 1);
});

test("wrong-visitor, unowned, and other-account searches are permanent rejections", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const other = f.visitor();
  for (const search of [f.search(other.id), f.search(null), f.search(visitor.id, randomUUID(), "different-account")]) {
    assert.deepEqual(await f.service.recordClientJourneyEvent(client(visitor.id, search.requestId)), { accepted: false });
  }
  assert.equal(f.events.length, 0);
});

test("simultaneous first events and retry duplicates create one journey and preserve distinct events", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const search = f.search(visitor.id);
  const events = Array.from({ length: 8 }, () => client(visitor.id, search.requestId));
  const receipts = await Promise.all([...events, ...events].map(event => f.service.recordClientJourneyEvent(event)));
  assert.ok(receipts.every(receipt => receipt.accepted));
  assert.equal(f.journeys.length, 1);
  assert.equal(f.events.length, 8);
});

test("client UUIDs are scoped to visitors and cannot touch another visitor's journey", async () => {
  const f = fixture();
  const first = f.visitor();
  const second = f.visitor();
  const firstSearch = f.search(first.id);
  const secondSearch = f.search(second.id);
  const event = client(first.id, firstSearch.requestId);
  assert.deepEqual(await f.service.recordClientJourneyEvent(event), { accepted: true });
  const firstActivity = f.journeys[0].lastActivityAt;
  f.setTime(new Date(firstActivity.getTime() + 1000));
  assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, visitorId: second.id, requestId: secondSearch.requestId }), { accepted: true });
  assert.equal(f.journeys.length, 2);
  assert.equal(f.events.length, 2);
  assert.notEqual(f.events[0].journeyId, f.events[1].journeyId);
  assert.equal(f.journeys[0].lastActivityAt, firstActivity);
});

test("retries do not extend sessions and a reused UUID cannot claim a different search", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const search = f.search(visitor.id);
  const event = client(visitor.id, search.requestId);
  assert.deepEqual(await f.service.recordClientJourneyEvent(event), { accepted: true });
  const activity = f.journeys[0].lastActivityAt;
  f.setTime(new Date(activity.getTime() + 31 * 60_000));
  assert.deepEqual(await f.service.recordClientJourneyEvent(event), { accepted: true });
  assert.equal(f.journeys[0].lastActivityAt, activity);
  assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, requestId: f.search(visitor.id).requestId }), { accepted: false });
  assert.deepEqual(await f.service.recordClientJourneyEvent({ ...event, eventId: randomUUID(), type: "OFFER_SELECTED" }), { accepted: true });
  assert.equal(f.journeys.length, 2);
});

test("progressive first-batch history accepts early clicks and completes once without regressing later", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const history: SearchHistoryInput = { visitorId: visitor.id, requestId: randomUUID(), type: "HOTEL", query: {},
    resultCount: 3, latencyMs: 10, status: "PARTIAL", progressive: true, completed: false };
  assert.ok(await f.service.recordSearchHistory(history));
  assert.equal(f.events.length, 0, "a first batch is not a completed search");
  assert.deepEqual(await f.service.recordClientJourneyEvent(client(visitor.id, history.requestId!)), { accepted: true });
  const final = { ...history, resultCount: 9, latencyMs: 20, status: "SUCCESS" as const, completed: true };
  await Promise.all([f.service.recordSearchHistory(final), f.service.recordSearchHistory(final)]);
  await f.service.recordSearchHistory(history);
  await f.service.recordSearchHistory({ ...final, resultCount: 0, status: "FAILED" });
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].resultCount, 9);
  assert.equal(f.histories[0].status, "SUCCESS");
  assert.equal(f.events.filter(event => event.type === "SEARCH_COMPLETED").length, 1);
  assert.equal(f.journeys.length, 1);
});

test("a late progressive partial page cannot reopen a completed failed search", async () => {
  const f = fixture();
  const visitor = f.visitor();
  const history: SearchHistoryInput = { visitorId: visitor.id, requestId: randomUUID(), type: "HOTEL", query: {},
    resultCount: 3, latencyMs: 10, status: "PARTIAL", progressive: true, completed: false };
  await f.service.recordSearchHistory(history);
  await f.service.recordSearchHistory({ ...history, completed: true, status: "FAILED", resultCount: 0 });
  await f.service.recordSearchHistory(history);
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].resultCount, 3);
  assert.equal(f.histories[0].status, "FAILED");
  assert.equal(f.events.filter(event => event.type === "SEARCH_COMPLETED").length, 1);
});

test("a duplicate request ID cannot overwrite another owner or associate their search completion", async () => {
  const f = fixture();
  const owner = f.visitor();
  const other = f.visitor();
  const requestId = randomUUID();
  const history: SearchHistoryInput = { requestId, type: "HOTEL", query: {}, resultCount: 3, latencyMs: 10, status: "SUCCESS", progressive: true };
  assert.ok(await f.service.recordSearchHistory({ ...history, visitorId: owner.id }));
  assert.equal(await f.service.recordSearchHistory({ ...history, visitorId: other.id, resultCount: 100 }), null);
  assert.equal(f.histories.length, 1);
  assert.equal(f.histories[0].visitorId, owner.id);
  assert.equal(f.histories[0].resultCount, 3);
  assert.equal(f.events.length, 1);
});

test("withdrawal before history persistence removes visitor attribution but retains a verified account", async () => {
  const f = fixture();
  const visitor = f.visitor("linked", "account-a");
  visitor.consentStatus = "WITHDRAWN";
  visitor.trackingDisabledAt = new Date();
  await f.service.recordSearchHistory({ visitorId: visitor.id, userId: "account-a", requestId: randomUUID(),
    type: "FLIGHT", query: {}, resultCount: 1, latencyMs: 10, status: "SUCCESS" });
  assert.equal(f.histories[0].visitorId, null);
  assert.equal(f.histories[0].userId, "account-a");
  assert.equal(f.journeys.length, 0);
});

test("optional storage failure is retryable only after an eligible visitor was established", async () => {
  const service = createSearchJourneyService(() => null);
  assert.deepEqual(await service.recordClientJourneyEvent(client("visitor", randomUUID())), { accepted: false, retryable: true });
  assert.deepEqual(await service.recordClientJourneyEvent({ ...client("visitor", randomUUID()), visitorId: null }), { accepted: false });
  assert.equal(await service.recordJourneyEvent({ visitorId: "visitor", type: "SEARCH_COMPLETED", eventKey: "search:unavailable" }), null);
});
