import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_CONFIRMED_TRIPS_PAGE_SIZE,
  decodeAdminTripCursor,
  encodeAdminTripCursor,
  isValidAdminTripId,
  parseAdminTripFilters,
  tripConfirmationWindow,
  tripDirectoryHref,
  tripNeedsStatusReview,
} from "./adminConfirmedTripsDirectory";

const parsed = parseAdminTripFilters({
  q: "  Lagos  ",
  provider: "Duffel",
  product: "FLIGHT",
  status: "UPCOMING",
  from: "2026-10-01",
  to: "2026-10-26",
});
if (!parsed.ok) throw Error("test filters invalid");
const filters = parsed.filters;
const position = { id: "cm2confirmedtrip0000000001", confirmedAt: "2026-10-26T10:00:00.000Z" };

test("confirmed trip directory filters validate text, enum and UTC boundaries", () => {
  assert.equal(ADMIN_CONFIRMED_TRIPS_PAGE_SIZE, 20);
  assert.deepEqual(filters, {
    q: "Lagos", provider: "Duffel", product: "FLIGHT", status: "UPCOMING",
    from: "2026-10-01", to: "2026-10-26",
  });
  assert.equal(parseAdminTripFilters({ product: "unsupported" }).ok, false);
  assert.equal(parseAdminTripFilters({ status: "COMPLETED" }).ok, false);
  assert.equal(parseAdminTripFilters({ q: "a\nb" }).ok, false);
  assert.equal(parseAdminTripFilters({ q: "x".repeat(81) }).ok, false);
  assert.equal(parseAdminTripFilters({ provider: "x".repeat(101) }).ok, false);
  assert.equal(parseAdminTripFilters({ q: ["a", "b"] }).ok, false);
  assert.equal(parseAdminTripFilters({ from: "2026-02-30" }).ok, false);
  assert.equal(parseAdminTripFilters({ from: "2026-10-27", to: "2026-10-26" }).ok, false);
  const period = tripConfirmationWindow(filters);
  assert.equal(period.gte?.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(period.lt?.toISOString(), "2026-10-27T00:00:00.000Z");
});

test("pagination cursor is bound to filters and environment and fails closed", () => {
  const cursor = encodeAdminTripCursor(position, filters, "staging");
  assert.deepEqual(decodeAdminTripCursor(cursor, filters, "staging"), position);
  assert.equal(decodeAdminTripCursor(cursor, filters, "production"), null);
  assert.equal(decodeAdminTripCursor(cursor, { ...filters, provider: "KAYAK" }, "staging"), null);
  assert.equal(decodeAdminTripCursor(cursor, { ...filters, status: "PAST" }, "staging"), null);
  assert.equal(decodeAdminTripCursor("invalid!base64", filters, "staging"), null);
  assert.equal(decodeAdminTripCursor("a".repeat(901), filters, "staging"), null);
  assert.equal(decodeAdminTripCursor(undefined, filters, "staging"), undefined);
});

test("directory links retain selected filters and use no external destinations", () => {
  const href = tripDirectoryHref(filters, "next-page");
  const u = new URL(href, "https://kurioticket.test");
  assert.equal(u.pathname, "/admin/confirmed-trips/records");
  assert.equal(u.searchParams.get("cursor"), "next-page");
  assert.equal(u.searchParams.get("q"), "Lagos");
  assert.equal(u.searchParams.get("status"), "UPCOMING");
  assert.equal(u.searchParams.get("provider"), "Duffel");
});

test("trip IDs and status review flags do not fabricate provider status", () => {
  assert.equal(isValidAdminTripId(position.id), true);
  assert.equal(isValidAdminTripId("../../secret"), false);
  assert.equal(tripNeedsStatusReview({ status: "UPCOMING", departureDate: "2026-10-01T00:00:00.000Z" }, new Date("2026-10-26T00:00:00.000Z")), true);
  assert.equal(tripNeedsStatusReview({ status: "PAST", departureDate: "2026-10-01T00:00:00.000Z" }, new Date("2026-10-26T00:00:00.000Z")), false);
  assert.equal(tripNeedsStatusReview({ status: "UPCOMING", departureDate: "2026-11-01T00:00:00.000Z" }, new Date("2026-10-26T00:00:00.000Z")), false);
});
