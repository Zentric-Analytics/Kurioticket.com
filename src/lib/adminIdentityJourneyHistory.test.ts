import assert from "node:assert/strict";
import test from "node:test";
import { encodeAdminJourneyCursor, parseAdminJourneyQuery } from "@/services/adminJourneyContract";
import { identityJourneyHistoryHref, identityJourneyHistoryQuery } from "./adminIdentityJourneyHistory";
import { decodeActivityCursor, encodeActivityCursor, type ActivityFilters } from "./adminIdentityActivity";
import { journeyCalendarTimeZone } from "./adminJourneyDateRange";
import { resetStaleJourneyDateCursor } from "./adminJourneyDateCursor";

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
