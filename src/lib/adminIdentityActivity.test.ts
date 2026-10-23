import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_PAGE_SIZE, activityEnvironmentScope, allowedActivityStages, activityHref, activityWindow,
  decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, groupActivityRows, relatedJourneysWindow,
  parseActivityFilters, sourceActivitySeek, validActivityIdentity,
  type ActivityFilters,
} from "./adminIdentityActivity";
import { eligibleJourneyLinkedVisitorWhere, eligibleLinkedVisitorWhere, type ActivityRow } from "./adminIdentityJourney";

const filters: ActivityFilters = {
  tab: "all", stage: "all", product: "all", from: "", to: "", q: "",
};
const id = "cmvju17ci00062ajiy60e0yhf";

test("identity routes accept only explicit user or guest IDs", () => {
  assert.equal(validActivityIdentity("guest", id), true);
  assert.equal(validActivityIdentity("user", "cmr9a7b1"), true);
  for (const [kind, visitorId] of [
    ["staff", id], ["guest", "../../etc/passwd"], ["guest", "id"], ["user", "abc%2Fother"],
  ]) assert.equal(validActivityIdentity(kind, visitorId), false);
});

test("activity filters validate tab, product, activity stage, date and search", () => {
  const result = parseActivityFilters({ tab: "searches", stage: "RESULTS_VIEWED", product: "HOTEL", from: "2026-10-01", to: "2026-10-22", q: "London" });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.filters.q, "London");
    assert.equal(activityWindow(result.filters).gte?.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.equal(activityWindow(result.filters).lt?.toISOString(), "2026-10-23T00:00:00.000Z");
  }
  for (const raw of [
    { from: "2026-02-31" }, { from: "2026-10-23", to: "2026-10-22" },
    { stage: "MANUAL_PAYMENT" }, { product: "CRUISE" }, { tab: "users" },
    { q: "x".repeat(81) }, { product: ["FLIGHT", "HOTEL"] },
  ]) assert.equal(parseActivityFilters(raw).ok, false);
});

test("every tab exposes only its own recorded stages", () => {
  const stages = (tab: ActivityFilters["tab"], stage: ActivityFilters["stage"] = "all") =>
    [...allowedActivityStages({ ...filters, tab, stage })];
  assert.deepEqual(stages("searches"), ["SEARCH_COMPLETED", "RESULTS_VIEWED"]);
  assert.deepEqual(stages("selections"), ["OFFER_SELECTED"]);
  assert.deepEqual(stages("handoffs"), ["PROVIDER_HANDOFF_STARTED"]);
  assert.deepEqual(stages("searches", "OFFER_SELECTED"), []);
  assert.ok(stages("all").includes("ACCOUNT_ACTIVITY"));
  assert.ok(!stages("selections").includes("ACCOUNT_ACTIVITY"));
});

test("page cursor is bound to one identity and exact filters", () => {
  const row = { id: "j-cmvuevent104", at: new Date("2026-10-22T17:48:00.000Z") };
  const token = encodeActivityCursor(row, "guest", id, filters, "production");
  assert.deepEqual(decodeActivityCursor(token, "guest", id, filters, "production"), { id: row.id, at: row.at.toISOString() });
  assert.equal(decodeActivityCursor(token, "user", id, filters, "production"), null);
  assert.equal(decodeActivityCursor(token, "guest", id, filters, "staging"), null);
  assert.equal(decodeActivityCursor(token, "guest", "different-visitor", filters, "production"), null);
  assert.equal(decodeActivityCursor(token, "guest", id, { ...filters, product: "FLIGHT" }, "production"), null);
  assert.equal(decodeActivityCursor("invalid?cursor", "guest", id, filters, "production"), null);
  assert.equal(decodeActivityCursor(undefined, "guest", id, filters, "production"), undefined);
});

test("cross-source keyset keeps stable ties without repeating the cursor item", () => {
  const cursor = { at: "2026-10-22T17:48:00.000Z", id: "j-cmvuevent104" };
  assert.deepEqual(sourceActivitySeek(cursor, "e"), { createdAt: { lt: new Date(cursor.at) } });
  assert.deepEqual(sourceActivitySeek(cursor, "s"), { createdAt: { lte: new Date(cursor.at) } });
  assert.deepEqual(sourceActivitySeek(cursor, "j"), {
    OR: [{ createdAt: { lt: new Date(cursor.at) } }, { createdAt: new Date(cursor.at), id: { gt: "cmvuevent104" } }],
  });
  assert.deepEqual(sourceActivitySeek(undefined, "j"), {});
  assert.equal(ACTIVITY_PAGE_SIZE, 20);
});

test("legacy searches and handoffs cannot repeat on later pages after matching canonical stages", () => {
  const owner = { journey: { visitor: { consentStatus: "GRANTED", currentUserId: null } } } as const;
  const window = { gte: new Date("2026-10-01T00:00:00.000Z") };
  const product = { product: "FLIGHT" } as const;
  const query = { provider: { contains: "Duffel" } };
  const searchExclusion = excludeCanonicalLegacyRows("SEARCH_COMPLETED", owner, window, product, query);
  const handoffExclusion = excludeCanonicalLegacyRows("PROVIDER_HANDOFF_STARTED", owner, window, product, query);
  assert.deepEqual(searchExclusion, { journeyEvents: { none: { AND: [
    owner, { type: "SEARCH_COMPLETED" }, { createdAt: window }, product, query,
  ] } } });
  assert.deepEqual(handoffExclusion, { journeyEvents: { none: { AND: [
    owner, { type: "PROVIDER_HANDOFF_STARTED" }, { createdAt: window }, product, query,
  ] } } });
  // A journey seen on an earlier page must still suppress its legacy duplicate.
  const previousPage = { at: "2026-10-22T17:48:00.000Z", id: "j-cmvuevent104" };
  assert.equal(JSON.stringify(searchExclusion).includes(previousPage.id), false);
  assert.equal(JSON.stringify(handoffExclusion).includes(previousPage.at), false);
});

test("timeline groups a journey only once and keeps verified events in their original order", () => {
  const at = new Date("2026-10-22T17:48:00.000Z");
  const events: ActivityRow[] = [
    { id: "j-one", label: "Results viewed", detail: "Hotel", at, journeyId: "j-1", journeyStartedAt: at, product: "HOTEL", stage: "RESULTS_VIEWED" },
    { id: "j-two", label: "Search completed", detail: "Flight", at: new Date(at.getTime() - 1000), journeyId: "j-1", product: "FLIGHT", stage: "SEARCH_COMPLETED" },
    { id: "s-old", label: "Search completed", detail: "Flight", at: new Date(at.getTime() - 2000), product: "FLIGHT", stage: "SEARCH_COMPLETED" },
  ];
  const groups = groupActivityRows(events);
  assert.deepEqual(groups.map(x => x.key), ["j-1", "other"]);
  assert.deepEqual(groups[0].events.map(x => x.id), ["j-one", "j-two"]);
  assert.deepEqual(groups[0].products, ["HOTEL", "FLIGHT"]);
  assert.equal(groups[1].journeyId, null);
});

test("filter navigation preserves directory context but removes pagination when switching tabs", () => {
  const href = activityHref("/admin/users/guest/cmvju17ci00062ajiy60e0yhf/activity",
    { tab: "all", directory: "identity%3DGUEST", cursor: "past" },
    { tab: "searches", cursor: null });
  assert.ok(href.includes("tab=searches"));
  assert.ok(href.includes("directory="));
  assert.ok(!href.includes("cursor="));
});

test("activity timeline filters every source by the same environment as its links", () => {
  const staging = activityEnvironmentScope("staging");
  assert.deepEqual(staging, {
    journey: { AND: [
      { metadata: { path: ["environment"], equals: "staging" } },
      { OR: [
        { searchHistoryId: null },
        { searchHistory: { is: { query: { path: ["environment"], equals: "staging" } } } },
      ] },
      { OR: [
        { redirectLogId: null },
        { redirectLog: { is: { metadata: { path: ["environment"], equals: "staging" } } } },
      ] },
    ] },
    search: { query: { path: ["environment"], equals: "staging" } },
    handoff: { metadata: { path: ["environment"], equals: "staging" } },
    analytics: { metadata: { path: ["environment"], equals: "staging" } },
  });
  const production = activityEnvironmentScope("production");
  assert.notDeepEqual(staging, production);
  assert.deepEqual(production.search, { query: { path: ["environment"], equals: "production" } });
  assert.deepEqual(production.analytics, { metadata: { path: ["environment"], equals: "production" } });
});

test("registered journey filters require the same verified active account as journey details", () => {
  const base = eligibleLinkedVisitorWhere(id);
  const scoped = eligibleJourneyLinkedVisitorWhere(id);
  assert.deepEqual(scoped, {
    ...base,
    currentUser: { is: { status: "ACTIVE", emailVerified: { not: null } } },
  });
  // Keep legacy search and handoff eligibility separate, so recorded history
  // is still readable when a registered account cannot open a journey.
  assert.equal(Object.hasOwn(base, "currentUser"), false);
});

test("related journeys use displayed historical activity, not an unrelated seven-day default", () => {
  const now = new Date("2026-10-23T12:00:00.000Z");
  const rows: ActivityRow[] = [
    { id: "e-today", label: "Account signup", detail: "", at: new Date("2026-10-23T08:00:00.000Z") },
    { id: "j-old", label: "Search completed", detail: "", journeyId: "old-journey", at: new Date("2026-04-12T12:00:00.000Z") },
  ];
  assert.deepEqual(relatedJourneysWindow(rows, now), {
    from: "2026-04-11T12:00:00.000Z",
    to: "2026-04-13T12:00:00.000Z",
  });
  assert.equal(relatedJourneysWindow([], now), null);
});

test("related journeys never exceed the ninety-day journey API window", () => {
  const now = new Date("2026-10-23T12:00:00.000Z");
  const rows: ActivityRow[] = [
    { id: "j-recent", label: "Results viewed", detail: "", journeyId: "recent", at: new Date("2026-09-01T12:00:00.000Z") },
    { id: "j-ancient", label: "Search completed", detail: "", journeyId: "ancient", at: new Date("2026-01-01T12:00:00.000Z") },
  ];
  const range = relatedJourneysWindow(rows, now);
  assert.ok(range);
  const start = Date.parse(range.from);
  const end = Date.parse(range.to);
  assert.ok(start < Date.parse(rows[0].at.toISOString()));
  assert.ok(Date.parse(rows[0].at.toISOString()) < end);
  assert.ok(end <= now.getTime());
  assert.ok(end - start <= 90 * 86_400_000);
});
