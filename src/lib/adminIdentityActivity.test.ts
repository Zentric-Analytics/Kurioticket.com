import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_PAGE_SIZE, activityEnvironmentScope, allowedActivityStages, activityHref, activityWindow,
  compactActivityDisplayRows, decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, groupActivityRows, latestVisibleActivityAt, relatedJourneysWindow,
  parseActivityFilters, sourceActivitySeek, validActivityIdentity,
  type ActivityFilters,
} from "./adminIdentityActivity";
import { eligibleJourneyLinkedVisitorWhere, eligibleLinkedVisitorWhere, mergeAdminActivity, type ActivityRow } from "./adminIdentityJourney";

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


test("selection disclosures keep every original recorded event and do not combine unrelated offers", () => {
  const at = new Date("2026-10-22T17:56:00.000Z");
  const row = (id: string, minute: number, options: Partial<ActivityRow> = {}): ActivityRow => ({
    id, at: new Date(at.getTime() - minute * 60_000),
    stage: "OFFER_SELECTED", label: "Offer selected", detail: "Hotel · London · Provider A",
    journeyId: "qa-journey-1", product: "HOTEL", provider: "Provider A", ...options,
  });
  const events = [
    row("j-one", 0), row("j-two", 1), row("j-three", 2), row("j-four", 3),
    row("j-different-provider", 4, { provider: "Provider B" }),
    row("j-other-journey", 5, { journeyId: "qa-journey-2" }),
    row("e-unlinked", 6, { journeyId: undefined }),
    row("j-search", 7, { stage: "SEARCH_COMPLETED", label: "Search completed" }),
  ];
  const display = compactActivityDisplayRows(events);
  assert.deepEqual(display.map(x => x.kind), ["selection_run", "event", "event", "event", "event"]);
  assert.deepEqual(display.flatMap(x => x.kind === "selection_run" ? x.rows : [x.row]).map(x => x.id), events.map(x => x.id));
  assert.equal(display[0].kind, "selection_run");
  if (display[0].kind === "selection_run") {
    assert.deepEqual(display[0].rows.map(x => x.at.toISOString()), events.slice(0, 4).map(x => x.at.toISOString()));
  }
  assert.deepEqual(compactActivityDisplayRows(events.slice(0, 2)).map(x => x.kind), ["event", "event"]);
});

test("a different route, provider, product or stage interrupts selection folding", () => {
  const at = new Date("2026-10-22T17:50:00.000Z");
  const one: ActivityRow = {
    id: "j-1", at, stage: "OFFER_SELECTED", label: "Offer selected",
    detail: "Flight · LOS → DXB · Provider A", provider: "Provider A", product: "FLIGHT", journeyId: "journey-1",
  };
  for (const different of [
    { detail: "Flight · LOS → LHR · Provider A" }, { provider: "Provider B" },
    { product: "HOTEL" }, { stage: "RESULTS_VIEWED" as const },
  ]) {
    const display = compactActivityDisplayRows([one, { ...one, id: "j-2", ...different }, { ...one, id: "j-3" }]);
    assert.ok(display.every(x => x.kind === "event"));
  }
});

test("unknown-provider selections remain individually visible even if descriptions coincide", () => {
  const at = new Date("2026-10-22T17:55:00.000Z");
  const recorded: ActivityRow[] = [0, 1, 2].map(index => ({
    id: "j-unknown-" + index, at: new Date(at.getTime() - index * 1000),
    journeyId: "qa-same-journey", product: "HOTEL",
    label: "Offer selected", stage: "OFFER_SELECTED", detail: "Hotel · London",
    provider: null,
  }));
  assert.deepEqual(compactActivityDisplayRows(recorded).map(item => item.kind), ["event", "event", "event"]);
  assert.deepEqual(compactActivityDisplayRows(recorded.map(row => ({ ...row, provider: " " }))).map(item => item.kind), ["event", "event", "event"]);
  assert.deepEqual(compactActivityDisplayRows(recorded.map(row => ({ ...row, provider: "Known partner", detail: "" }))).map(item => item.kind), ["event", "event", "event"]);
});

test("Activity Explorer allows only supported sort values and binds cursor to the order", () => {
  const newest = parseActivityFilters({});
  const oldest = parseActivityFilters({ order: "oldest" });
  assert.equal(newest.ok, true);
  assert.equal(oldest.ok, true);
  if (!newest.ok || !oldest.ok) return;
  assert.equal(newest.filters.order, "newest");
  assert.equal(oldest.filters.order, "oldest");
  assert.equal(parseActivityFilters({ order: "random" }).ok, false);
  const row = { id: "j-qaevent104", at: new Date("2026-10-22T12:00:00Z") };
  const oldestToken = encodeActivityCursor(row, "guest", id, oldest.filters, "staging");
  assert.deepEqual(decodeActivityCursor(oldestToken, "guest", id, oldest.filters, "staging"), {
    id: row.id, at: row.at.toISOString(),
  });
  assert.equal(decodeActivityCursor(oldestToken, "guest", id, newest.filters, "staging"), null);
  const classicToken = encodeActivityCursor(row, "guest", id, filters, "staging");
  assert.deepEqual(decodeActivityCursor(classicToken, "guest", id, newest.filters, "staging"), {
    id: row.id, at: row.at.toISOString(),
  }); // Existing newest-first cursor links stay valid.
});

test("oldest-first keyset and merged sources retain stable ties without repeating page boundaries", () => {
  const at = new Date("2026-10-22T17:48:00.000Z");
  const cursor = { at: at.toISOString(), id: "j-cmvuevent104" };
  assert.deepEqual(sourceActivitySeek(cursor, "e", "oldest"), { createdAt: { gt: at } });
  assert.deepEqual(sourceActivitySeek(cursor, "s", "oldest"), { createdAt: { gte: at } });
  assert.deepEqual(sourceActivitySeek(cursor, "j", "oldest"), {
    OR: [{ createdAt: { gt: at } }, { createdAt: at, id: { gt: "cmvuevent104" } }],
  });
  const previous = { id: "s-older", label: "Search completed", detail: "Old activity", at: new Date(at.getTime() - 3000) };
  const newer = { id: "j-newer", label: "Results viewed", detail: "Later activity", at: new Date(at.getTime() + 3000) };
  const sameAtA = { id: "j-a", label: "Offer selected", detail: "Same time", at };
  const sameAtB = { id: "j-b", label: "Offer selected", detail: "Same time", at };
  const ordered = mergeAdminActivity([newer, sameAtB, sameAtA], [previous], 10, "oldest");
  assert.deepEqual(ordered.map(x => x.id), ["s-older", "j-a", "j-b", "j-newer"]);
  assert.deepEqual(mergeAdminActivity([newer, sameAtB, sameAtA], [previous], 10).map(x => x.id),
    ["j-newer", "j-a", "j-b", "s-older"]);
});

test("visible activity header uses maximum timestamp regardless of newest/oldest sorting", () => {
  const at = ["2026-10-22T09:00:00Z", "2026-10-22T13:00:00Z", "2026-10-22T11:00:00Z"];
  const events: ActivityRow[] = at.map((stamp, i) => ({
    id: "j-qa-" + i, at: new Date(stamp), label: "Search completed", detail: "Flight",
  }));
  const latest = "2026-10-22T13:00:00.000Z";
  assert.equal(latestVisibleActivityAt(events)?.toISOString(), latest);
  assert.equal(latestVisibleActivityAt([...events].reverse())?.toISOString(), latest);
  assert.equal(latestVisibleActivityAt([]), null);
});
