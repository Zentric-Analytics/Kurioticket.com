import assert from "node:assert/strict";
import test from "node:test";

import { parseAdminTripWorkspace, tripWorkspaceHref } from "./adminTripWorkspace";

const now = new Date("2026-11-03T15:42:00.000Z");

test("all-time and UTC day-based ranges normalize to the same filters used by the directory", () => {
  const all = parseAdminTripWorkspace({}, now);
  assert.equal(all.ok, true);
  if (!all.ok) return;
  assert.equal(all.range, "all");
  assert.equal(all.filters.from, "");
  assert.equal(all.filters.to, "");

  const today = parseAdminTripWorkspace({ range: "today", product: "FLIGHT", status: "CANCELLED" }, now);
  assert.equal(today.ok, true);
  if (!today.ok) return;
  assert.deepEqual([today.filters.from, today.filters.to], ["2026-11-03", "2026-11-03"]);
  assert.equal(today.filters.status, "CANCELLED");
  assert.equal(today.filters.product, "FLIGHT");
  assert.deepEqual(today.dateFields, { from: "", to: "" });

  const week = parseAdminTripWorkspace({ range: "7d" }, now);
  assert.equal(week.ok, true);
  if (week.ok) assert.deepEqual([week.filters.from, week.filters.to], ["2026-10-28", "2026-11-03"]);
  const month = parseAdminTripWorkspace({ range: "30d" }, now);
  assert.equal(month.ok, true);
  if (month.ok) assert.deepEqual([month.filters.from, month.filters.to], ["2026-10-05", "2026-11-03"]);
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
  assert.equal(href.searchParams.has("from"), false);
  assert.equal(href.searchParams.has("to"), false);
  assert.equal(href.searchParams.get("status"), "CANCELLED");
});
