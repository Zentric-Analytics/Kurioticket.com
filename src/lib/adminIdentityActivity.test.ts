import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_PAGE_SIZE, allowedActivityStages, activityHref, activityWindow,
  decodeActivityCursor, encodeActivityCursor, excludeCanonicalLegacyRows, groupActivityRows,
  parseActivityFilters, sourceActivitySeek, validActivityIdentity,
  type ActivityFilters,
} from "./adminIdentityActivity";
import type { ActivityRow } from "./adminIdentityJourney";

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
  const token = encodeActivityCursor(row, "guest", id, filters);
  assert.deepEqual(decodeActivityCursor(token, "guest", id, filters), { id: row.id, at: row.at.toISOString() });
  assert.equal(decodeActivityCursor(token, "user", id, filters), null);
  assert.equal(decodeActivityCursor(token, "guest", "different-visitor", filters), null);
  assert.equal(decodeActivityCursor(token, "guest", id, { ...filters, product: "FLIGHT" }), null);
  assert.equal(decodeActivityCursor("invalid?cursor", "guest", id, filters), null);
  assert.equal(decodeActivityCursor(undefined, "guest", id, filters), undefined);
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
  const owner = { journey: { visitor: { consentStatus: "GRANTED", currentUserId: null } } };
  const window = { gte: new Date("2026-10-01T00:00:00.000Z") };
  const product = { product: "FLIGHT" };
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
