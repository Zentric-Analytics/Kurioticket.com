import assert from "node:assert/strict";
import test from "node:test";
import { encodeAdminJourneyCursor, parseAdminJourneyQuery } from "@/services/adminJourneyContract";
import { identityJourneyHistoryHref, identityJourneyHistoryQuery, resetStaleIdentityJourneyDateCursor } from "./adminIdentityJourneyHistory";
import { decodeActivityCursor, encodeActivityCursor, type ActivityFilters } from "./adminIdentityActivity";
import { journeyCalendarTimeZone } from "./adminJourneyDateRange";
import { resetStaleJourneyDateCursor } from "./adminJourneyDateCursor";
import { activityJourneyReturnHref, decodeActivityJourneyReturn, encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import { completeJourneyDetailHref } from "./adminActivityOverview";

const now = new Date("2026-11-20T10:00:00.000Z");
const guest = "qa-visitor-0001";
const user = "qa-account-0001";

test("Users journey history is identity-bound and defaults to Today, with All time selectable", () => {
  const request = identityJourneyHistoryQuery("guest", guest, {}, now, "staging");
  assert.equal(request.ok, true);
  if (!request.ok) return;
  assert.equal(request.range, "today");
  assert.equal(request.input.from, "2026-11-20T00:00:00.000Z");
  assert.equal(request.input.visitorId, guest);
  assert.equal(request.input.userId, undefined);
  const parsed = parseAdminJourneyQuery(request.input, "list", now, "staging");
  assert.equal(parsed.status, "ok");
  if (parsed.status === "ok") {
    assert.equal(parsed.data.scope.identity, "guest");
    assert.equal(parsed.data.scope.visitorId, guest);
  }
});

test("explicit All time still shows the complete retained window", () => {
  const request = identityJourneyHistoryQuery("guest", guest, {range:"all"}, now, "staging");
  assert.equal(request.ok,true);
  if (!request.ok) return;
  assert.equal(request.range,"all");
  assert.equal(request.input.from,"1970-01-01T00:00:00.000Z");
});

test("older All time preset links with only an observed cutoff refresh across the full retained period", () => {
  const cutoff = "2026-11-19T12:34:56.789Z";
  const request = identityJourneyHistoryQuery("guest", guest, { range: "all", to: cutoff }, now, "staging");
  assert.ok(request.ok);
  const result = parseAdminJourneyQuery(request.input, "list", now, "staging");
  assert.ok(result.status === "ok");
  assert.equal(result.data.scope.from, "1970-01-01T00:00:00.000Z");
  assert.equal(result.data.scope.to, now.toISOString(), "a newest preset remains live even if an old link materialized its cutoff");
});

test("newest Journey list to detail and Back remains live while its older Activity return stays fixed", () => {
  const origin = "https://kurioticket.test";
  const later = new Date(+now + 120_000);
  const parent = "/admin/users/user/" + user + "/activity/all?" + new URLSearchParams({
    range: "custom", from: "2026-11-18T12:34:56.789Z", to: "2026-11-19T12:34:56.789Z",
    usersReturn: "/admin/users/online?platform=ios&page=3",
  });
  const activityReturn = encodeActivityJourneyReturn(parent);
  assert.ok(activityReturn);
  for (const range of ["all", "today", "24h", "7d", "30d", "90d"]) {
    const first = identityJourneyHistoryQuery("user", user, { range, product: "FLIGHT", activityReturn }, now, "staging");
    assert.ok(first.ok);
    const firstResult = parseAdminJourneyQuery(first.input, "list", now, "staging");
    assert.ok(firstResult.status === "ok");
    const generated = { range, product: "FLIGHT", from: firstResult.data.scope.from, to: firstResult.data.scope.to, activityReturn };
    const self = identityJourneyHistoryHref("user", user, generated);
    const selfUrl = new URL(self, origin);
    assert.equal(selfUrl.searchParams.has("from"), false);
    assert.equal(selfUrl.searchParams.has("to"), false);
    const detail = new URL(completeJourneyDetailHref("qa-journey-0001", "user", user, "staging", now, self), origin);
    const returned = decodeActivityJourneyReturn(detail.searchParams.get("activityReturn"));
    assert.ok(returned);
    const returnedRaw = Object.fromEntries(new URL(returned, origin).searchParams);
    assert.equal(decodeActivityJourneyReturn(returnedRaw.activityReturn), activityJourneyReturnHref(parent));
    for (const bookmark of [returnedRaw, generated]) {
      const refreshed = identityJourneyHistoryQuery("user", user, bookmark, later, "staging");
      assert.ok(refreshed.ok);
      const parsed = parseAdminJourneyQuery(refreshed.input, "list", later, "staging");
      assert.ok(parsed.status === "ok");
      assert.equal(parsed.data.scope.to, later.toISOString());
      assert.equal(parsed.data.scope.product, "FLIGHT");
      if (range === "all") assert.equal(parsed.data.scope.from, "1970-01-01T00:00:00.000Z");
    }
  }
});

test("explicit custom and legacy no-range Journey self-returns preserve exact historical bounds", () => {
  const from = "2026-11-18T13:24:35.123Z";
  const to = "2026-11-19T14:25:36.456Z";
  for (const range of ["custom", undefined]) {
    const href = identityJourneyHistoryHref("user", user, { range, from, to, product: "CAR" });
    const raw = Object.fromEntries(new URL(href, "https://kurioticket.test").searchParams);
    assert.equal(raw.from, from);
    assert.equal(raw.to, to);
    const requested = identityJourneyHistoryQuery("user", user, raw, now, "staging");
    assert.ok(requested.ok);
    assert.equal(requested.input.from, from);
    assert.equal(requested.input.to, to);
  }
  for (const range of ["all", "today", "7d", "90d"]) {
    assert.equal(identityJourneyHistoryQuery("user", user, { range, from: "not-a-date", to }, now, "staging").ok, false);
    assert.equal(identityJourneyHistoryQuery("user", user, { range, from: to, to: from }, now, "staging").ok, false);
  }
});

test("supplied identity and environment cannot override the Users route", () => {
  const request = identityJourneyHistoryQuery("user", user, {
    range: "today", identity: "guest", userId: "other-account", visitorId: "other-visitor",
    environment: "production", product: "FLIGHT", stage: "RESULTS_VIEWED",
  }, now, "staging");
  assert.equal(request.ok, true);
  if (!request.ok) return;
  assert.equal(request.input.identity, "registered");
  assert.equal(request.input.userId, user);
  assert.equal(request.input.visitorId, undefined);
  assert.equal(request.input.environment, "staging");
  const parsed = parseAdminJourneyQuery(request.input, "list", now, "staging");
  assert.equal(parsed.status, "ok");
  if (parsed.status === "ok") {
    assert.equal(parsed.data.scope.product, "FLIGHT");
    assert.equal(parsed.data.scope.stage, "RESULTS_VIEWED");
  }
});

test("pagination cannot replay another identity's or environment's journey cursor", () => {
  const first = identityJourneyHistoryQuery("user", user, { range: "7d" }, now, "staging");
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const parsed = parseAdminJourneyQuery(first.input, "list", now, "staging");
  assert.equal(parsed.status, "ok");
  if (parsed.status !== "ok") return;
  const cursor = encodeAdminJourneyCursor({
    version: 1, kind: "list", at: "2026-11-19T10:00:00.000Z",
    id: "qa-journey-0001", scope: parsed.data.scope,
  });
  const next = identityJourneyHistoryQuery("user", user, { range: "7d", cursor }, now, "staging");
  assert.equal(next.ok, true);
  if (next.ok) assert.equal(parseAdminJourneyQuery(next.input, "list", now, "staging").status, "ok");
  const other = identityJourneyHistoryQuery("user", "another-account", { range: "7d", cursor }, now, "staging");
  assert.equal(other.ok, true);
  if (other.ok) assert.equal(parseAdminJourneyQuery(other.input, "list", now, "staging").status, "invalid");
  const switched = identityJourneyHistoryQuery("user", user, { range: "7d", cursor }, now, "production");
  assert.equal(switched.ok, true);
  if (switched.ok) assert.equal(parseAdminJourneyQuery(switched.input, "list", now, "production").status, "invalid");
});

test("duplicate, malformed and incomplete custom ranges are rejected before data access", () => {
  assert.equal(identityJourneyHistoryQuery("user", user, { product: ["FLIGHT", "HOTEL"] }, now, "staging").ok, false);
  assert.equal(identityJourneyHistoryQuery("user", user, { range: "everything" }, now, "staging").ok, false);
  assert.equal(identityJourneyHistoryQuery("user", user, { range: "custom", from: "2026-11-01T00:00:00Z" }, now, "staging").ok, false);
  const invalid = identityJourneyHistoryQuery("user", user, { range: "all", product: "TRAIN" }, now, "staging");
  assert.equal(invalid.ok, true);
  if (invalid.ok) assert.equal(parseAdminJourneyQuery(invalid.input, "list", now, "staging").status, "invalid");
});

test("journey pagination retains scoped filters without accepting identity overrides", () => {
  const href = identityJourneyHistoryHref("user", user, {
    range: "30d", product: "CAR", stage: "OFFER_SELECTED", userId: "other-user", environment: "production",
  }, "cursor-123");
  const url = new URL(href, "https://kurioticket.test");
  assert.equal(url.pathname, "/admin/users/user/" + user + "/journeys");
  assert.equal(url.searchParams.get("product"), "CAR");
  assert.equal(url.searchParams.get("cursor"), "cursor-123");
  assert.equal(url.searchParams.get("userId"), null);
  assert.equal(url.searchParams.get("environment"), null);
});

test("Unicode Online origin and an older All Activity page survive Journey pagination and detail return", () => {
  const origin = "https://kurioticket.test";
  const usersReturn = "/admin/users/online?" + new URLSearchParams({ q: "旅".repeat(120), platform: "android", page: "3" });
  const activityFilters: ActivityFilters = {
    tab: "all", stage: "all", product: "all", q: "", order: "newest",
    from: "1970-01-01T00:00:00.000Z", to: now.toISOString(),
  };
  const activityCursor = encodeActivityCursor({ id: "s-qa-history-0001", at: new Date("2026-11-19T08:00:00.000Z") },
    "guest", guest, activityFilters, "staging");
  const activityHref = "/admin/users/guest/" + guest + "/activity/all?" + new URLSearchParams({
    range: "all", from: activityFilters.from, to: activityFilters.to, cursor: activityCursor, usersReturn,
  });
  const token = encodeActivityJourneyReturn(activityHref);
  assert.ok(token && token.length > 1000 && token.length < 7000);
  const request = identityJourneyHistoryQuery("guest", guest, { range: "all", activityReturn: token }, now, "staging");
  assert.ok(request.ok);
  const result = parseAdminJourneyQuery(request.input, "list", now, "staging");
  assert.ok(result.status === "ok");
  const cursor = encodeAdminJourneyCursor({ version: 1, kind: "list", at: "2026-11-19T10:00:00.000Z",
    id: "qa-journey-0001", scope: result.data.scope });
  const nextHref = identityJourneyHistoryHref("guest", guest, { range: "all", from: result.data.scope.from,
    to: result.data.scope.to, activityReturn: token }, cursor);
  const nextRaw = Object.fromEntries(new URL(nextHref, origin).searchParams);
  assert.equal(nextRaw.cursor, cursor);
  assert.equal(decodeActivityJourneyReturn(nextRaw.activityReturn), activityJourneyReturnHref(activityHref));

  // The route builds the detail's return from raw query parameters. Preserve
  // the existing list cursor even when no new cursor is supplied to the href.
  const preserved = identityJourneyHistoryHref("guest", guest, nextRaw);
  const detail = new URL(completeJourneyDetailHref("qa-journey-0001", "guest", guest, "staging", now, preserved), origin);
  const returned = decodeActivityJourneyReturn(detail.searchParams.get("activityReturn"));
  assert.ok(returned);
  const returnedRaw = Object.fromEntries(new URL(returned, origin).searchParams);
  assert.deepEqual(returnedRaw, nextRaw);
  const finalActivity = decodeActivityJourneyReturn(returnedRaw.activityReturn);
  assert.ok(finalActivity);
  const finalRaw = new URL(finalActivity, origin).searchParams;
  assert.equal(finalRaw.get("usersReturn"), usersReturn);
  assert.deepEqual(decodeActivityCursor(finalRaw.get("cursor")!, "guest", guest, activityFilters, "staging"),
    { id: "s-qa-history-0001", at: "2026-11-19T08:00:00.000Z" });
  assert.equal(decodeActivityCursor(finalRaw.get("cursor")!, "guest", "other-guest", activityFilters, "staging"), null);
  for (const unsafe of ["https://evil.invalid/", "//evil.invalid/", "v1.invalid", "/admin/settings"]) {
    const invalid = new URL(identityJourneyHistoryHref("guest", guest, { activityReturn: unsafe }), origin);
    assert.equal(invalid.searchParams.has("activityReturn"), false);
  }
});

test("explicit identity Journey continuations retain their scope across midnight", () => {
  const firstAt = new Date("2026-11-26T23:59:50.000Z");
  const later = new Date("2026-11-27T00:00:10.000Z");
  const first = identityJourneyHistoryQuery("user", user, { range: "today" }, firstAt, "staging");
  assert.ok(first.ok);
  const parsed = parseAdminJourneyQuery(first.input, "list", firstAt, "staging");
  assert.ok(parsed.status === "ok");
  const cursor = encodeAdminJourneyCursor({ version: 1, kind: "list", at: "2026-11-26T23:00:00.000Z",
    id: "qa-journey-0001", scope: parsed.data.scope });
  const selection = { range: "today", from: parsed.data.scope.from, to: parsed.data.scope.to, cursor };
  assert.equal(resetStaleIdentityJourneyDateCursor(selection, later, "UTC"), selection);
  const request = identityJourneyHistoryQuery("user", user, selection, later, "staging");
  assert.ok(request.ok);
  const continued = parseAdminJourneyQuery(request.input, "list", later, "staging");
  assert.ok(continued.status === "ok");
  assert.deepEqual(continued.data.scope, parsed.data.scope);
  const wrongOwner = identityJourneyHistoryQuery("user", "other-account", selection, later, "staging");
  assert.ok(wrongOwner.ok);
  assert.equal(parseAdminJourneyQuery(wrongOwner.input, "list", later, "staging").status, "invalid");
});

test("operational continuation position survives compact return encoding and advances without duplicates", () => {
  const firstAt = new Date("2026-11-26T23:59:50.000Z");
  const later = new Date("2026-11-27T00:00:10.000Z");
  const filters: ActivityFilters = { tab: "all", stage: "all", product: "all", q: "", order: "newest",
    from: "2026-11-26T00:00:00.000Z", to: firstAt.toISOString() };
  const oldCursor = encodeActivityCursor({ id: "s-qa-search-0001", at: new Date("2026-11-26T23:00:00.000Z") }, "guest", guest, filters, "staging");
  const nextCursor = encodeActivityCursor({ id: "s-qa-search-0002", at: new Date("2026-11-26T22:00:00.000Z") }, "guest", guest, filters, "staging");
  const selection = { range: "today", from: filters.from, to: filters.to, activityCursor: oldCursor };
  assert.equal(resetStaleIdentityJourneyDateCursor(selection, later, "UTC"), selection);
  const request = identityJourneyHistoryQuery("guest", guest, selection, later, "staging");
  assert.ok(request.ok);
  assert.equal(request.input.from, filters.from);
  assert.equal(request.input.to, filters.to);
  const href = identityJourneyHistoryHref("guest", guest, { ...selection, activityCursor: nextCursor });
  const token = encodeActivityJourneyReturn(href);
  assert.ok(token);
  const decoded = decodeActivityJourneyReturn(token);
  assert.ok(decoded);
  const raw = new URL(decoded, "https://kurioticket.test").searchParams;
  assert.deepEqual(raw.getAll("activityCursor"), [nextCursor]);
  assert.deepEqual(decodeActivityCursor(raw.get("activityCursor")!, "guest", guest, filters, "staging"),
    { id: "s-qa-search-0002", at: "2026-11-26T22:00:00.000Z" });
});

test("identity Journey History materializes 90 civil dates and preserves them in the next-page scope", () => {
  const zone = "America/New_York";
  const selection = { range: "custom", from: "2026-08-07", to: "2026-11-04" };
  const request = identityJourneyHistoryQuery("guest", guest, selection, now, "staging", zone);
  assert.ok(request.ok);
  const calendarZone = journeyCalendarTimeZone(selection, zone);
  const first = parseAdminJourneyQuery(request.input, "list", now, "staging", undefined, calendarZone);
  assert.ok(first.status === "ok");
  assert.equal(first.data.scope.to, "2026-11-05T05:00:00.000Z");

  const cursor = encodeAdminJourneyCursor({
    version: 1, kind: "list", at: "2026-11-04T23:00:00.000Z",
    id: "qa-journey-0001", scope: first.data.scope,
  });
  const nextHref = new URL(identityJourneyHistoryHref("guest", guest, selection, cursor), "https://kurioticket.test");
  const nextRaw = Object.fromEntries(nextHref.searchParams);
  const next = identityJourneyHistoryQuery("guest", guest, nextRaw, now, "staging", zone);
  assert.ok(next.ok);
  const nextResult = parseAdminJourneyQuery(next.input, "list", now, "staging", undefined, journeyCalendarTimeZone(nextRaw, zone));
  assert.ok(nextResult.status === "ok");
  assert.deepEqual(nextResult.data.scope, first.data.scope);
});

test("operational guest continuation freezes the cutoff of the last partial civil day", () => {
  const zone = "America/New_York";
  const selection = { range: "custom", from: "2026-08-07", to: "2026-11-04" };
  const initialTime = new Date("2026-11-05T04:45:00.000Z");
  const refreshedTime = new Date("2026-11-05T04:55:00.000Z");
  const filters: ActivityFilters = { tab: "all", stage: "all", product: "all", from: "2026-08-07T04:00:00.000Z",
    to: initialTime.toISOString(), q: "", order: "newest" };
  const position = { id: "s-activity-001", at: new Date("2026-11-04T23:00:00.000Z") };
  const activityCursor = encodeActivityCursor(position, "guest", guest, filters, "staging");
  const raw = { ...selection, activityCursor };
  assert.equal(resetStaleJourneyDateCursor(raw, refreshedTime, zone), raw);
  assert.deepEqual(resetStaleJourneyDateCursor(raw, refreshedTime, "America/Chicago"), selection);
  const request = identityJourneyHistoryQuery("guest", guest, raw, refreshedTime, "staging", zone);
  assert.ok(request.ok);
  const parsed = parseAdminJourneyQuery(request.input, "list", refreshedTime, "staging", undefined, zone);
  assert.ok(parsed.status === "ok");
  assert.equal(parsed.data.scope.to, initialTime.toISOString());
  assert.deepEqual(decodeActivityCursor(activityCursor, "guest", guest, { ...filters, ...parsed.data.scope }, "staging"), {
    id: position.id, at: position.at.toISOString(),
  });
  assert.equal(decodeActivityCursor(activityCursor, "guest", "wrong-guest", filters, "staging"), null);
});
