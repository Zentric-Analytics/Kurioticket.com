import assert from "node:assert/strict";
import test from "node:test";

import { parseAdminTripWorkspace, tripWorkspaceHref } from "./adminTripWorkspace";
import { decodeAdminTripCursor, encodeAdminTripCursor, tripConfirmationWindow } from "./adminConfirmedTripsDirectory";

const now = new Date("2026-11-03T15:42:00.000Z");

test("Trips default to Today UTC while legacy rolling 24h remains available", () => {
  const current = parseAdminTripWorkspace({}, now);
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.equal(current.range, "today");
  assert.equal(current.filters.from, "2026-11-03");
  assert.equal(current.filters.to, "2026-11-03");

  const today = parseAdminTripWorkspace({ range: "today", product: "FLIGHT", status: "CANCELLED" }, now);
  assert.equal(today.ok, true);
  if (!today.ok) return;
  assert.deepEqual([today.filters.from, today.filters.to], ["2026-11-03", "2026-11-03"]);
  assert.equal(today.filters.status, "CANCELLED");
  assert.equal(today.filters.product, "FLIGHT");
  assert.deepEqual(today.dateFields, { from: "", to: "" });

  const week = parseAdminTripWorkspace({ range: "7d" }, now);
  assert.equal(week.ok, true);
  if (week.ok) assert.deepEqual([week.filters.from, week.filters.to], ["2026-10-27T15:42:00.000Z", "2026-11-03T15:42:00.000Z"]);
  const month = parseAdminTripWorkspace({ range: "30d" }, now);
  assert.equal(month.ok, true);
  if (month.ok) assert.deepEqual([month.filters.from, month.filters.to], ["2026-10-04T15:42:00.000Z", "2026-11-03T15:42:00.000Z"]);
  const legacy = parseAdminTripWorkspace({range:"24h"},now);
  assert.equal(legacy.ok, true);
  if (!legacy.ok) return;
  const saved = parseAdminTripWorkspace({ range: "24h", from: legacy.filters.from, to: legacy.filters.to }, new Date(now.getTime() + 60000));
  assert.equal(saved.ok, true);
  if (saved.ok) assert.deepEqual(saved.filters, legacy.filters);
});

test("custom dates remain editable and invalid or repeated ranges fail closed", () => {
  const custom = parseAdminTripWorkspace({ range: "custom", from: "2026-10-01", to: "2026-10-26" }, now);
  assert.equal(custom.ok, true);
  if (custom.ok) assert.deepEqual(custom.dateFields, { from: "2026-10-01", to: "2026-10-26" });

  const legacyDates = parseAdminTripWorkspace({ from: "2026-10-01" }, now);
  assert.equal(legacyDates.ok, true);
  if (legacyDates.ok) assert.equal(legacyDates.range, "custom");

  assert.equal(parseAdminTripWorkspace({ range: ["7d", "30d"] }, now).ok, false);
  assert.equal(parseAdminTripWorkspace({ range: "10m" }, now).ok, false);
  assert.equal(parseAdminTripWorkspace({ range: "custom", from: "2026-11-06", to: "2026-11-03" }, now).ok, false);
  assert.equal(parseAdminTripWorkspace({ range: "custom", from: "2026-02-30" }, now).ok, false);
  assert.equal(parseAdminTripWorkspace({ range: "custom", from: ["2026-11-01", "2026-11-02"] }, now).ok, false);
});

test("Trips Today follows the local calendar and keeps cursors scoped to the resulting window", () => {
  const when = new Date("2026-11-24T23:30:00.000Z");
  const lagos = parseAdminTripWorkspace({}, when, "Africa/Lagos");
  const dubai = parseAdminTripWorkspace({}, when, "Asia/Dubai");
  assert.ok(lagos.ok && dubai.ok);
  assert.equal(lagos.filters.from, "2026-11-25");
  const window = tripConfirmationWindow(lagos.filters);
  assert.equal(window.gte?.toISOString(), "2026-11-24T23:00:00.000Z");
  assert.equal(window.lt?.toISOString(), "2026-11-25T23:00:00.000Z");
  const position = { id: "confirmed_trip", confirmedAt: when.toISOString() };
  const cursor = encodeAdminTripCursor(position, lagos.filters, "production");
  assert.deepEqual(decodeAdminTripCursor(cursor, lagos.filters, "production"), position);
  assert.equal(decodeAdminTripCursor(cursor, dubai.filters, "production"), null);
});

test("Trips use complete local dates across DST while legacy rolling periods stay elapsed", () => {
  const zone = "Europe/London";
  const today = new Date("2026-03-30T14:00:00.000Z");
  const custom = parseAdminTripWorkspace({ range: "custom", from: "2026-03-29", to: "2026-03-29" }, today, zone);
  assert.ok(custom.ok);
  const window = tripConfirmationWindow(custom.filters);
  assert.equal(window.gte?.toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(window.lt?.toISOString(), "2026-03-29T23:00:00.000Z");
  assert.equal(new URL(tripWorkspaceHref(custom.filters, custom.range), "https://kurioticket.test").searchParams.get("to"), "2026-03-29");
  const rolling = parseAdminTripWorkspace({ range: "7d" }, today, zone);
  assert.ok(rolling.ok);
  assert.equal(Date.parse(rolling.filters.to) - Date.parse(rolling.filters.from), 7 * 86_400_000);
});

test("changing travel type or status keeps the rest of the chosen scope", () => {
  const parsed = parseAdminTripWorkspace({
    product: "HOTEL", status: "CANCELLED", q: "Sydney", provider: "Duffel", range: "custom",
    from: "2026-10-01", to: "2026-10-26",
  }, now);
  if (!parsed.ok) throw Error(parsed.error);

  const flights = new URL(tripWorkspaceHref(parsed.filters, parsed.range, { product: "FLIGHT" }), "https://kurioticket.test");
  assert.equal(flights.pathname, "/admin/confirmed-trips");
  assert.equal(flights.hash, "#trip-directory");
  assert.equal(flights.searchParams.get("product"), "FLIGHT");
  assert.equal(flights.searchParams.get("status"), "CANCELLED");
  assert.equal(flights.searchParams.get("q"), "Sydney");
  assert.equal(flights.searchParams.get("provider"), "Duffel");
  assert.equal(flights.searchParams.get("range"), "custom");
  assert.equal(flights.searchParams.get("from"), "2026-10-01");

  const statusReset = new URL(tripWorkspaceHref(parsed.filters, parsed.range, { status: "all" }), "https://kurioticket.test");
  assert.equal(statusReset.searchParams.get("status"), null);
  assert.equal(statusReset.searchParams.get("product"), "HOTEL");

  const past = new URL(tripWorkspaceHref(parsed.filters, parsed.range, { status: "PAST" }), "https://kurioticket.test");
  assert.equal(past.searchParams.get("status"), "PAST");
});

test("relative ranges do not persist stale custom dates in subsequent navigation", () => {
  const parsed = parseAdminTripWorkspace({ range: "7d", from: "2025-01-01", to: "2025-01-15", status: "UPCOMING" }, now);
  if (!parsed.ok) throw Error(parsed.error);
  const href = new URL(tripWorkspaceHref(parsed.filters, parsed.range, { status: "CANCELLED" }), "https://kurioticket.test");
  assert.equal(href.searchParams.get("range"), "7d");
  assert.equal(href.searchParams.get("from"), parsed.filters.from);
  assert.equal(href.searchParams.get("to"), parsed.filters.to);
  assert.equal(href.searchParams.get("status"), "CANCELLED");
});
