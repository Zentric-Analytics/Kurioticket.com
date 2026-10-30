import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { RecentConfirmedTripTable } = jiti("./RecentConfirmedTripTable") as typeof import("./RecentConfirmedTripTable");

type Trip = Parameters<typeof RecentConfirmedTripTable>[0]["trips"][number];
const sample: Trip = {
  id: "qa-confirmed-001",
  userId: "qa-user-123",
  userEmail: "qa@example.invalid",
  tripType: "FLIGHT",
  status: "UPCOMING",
  providerName: "QA Partner",
  providerConfirmationCode: "QA-REF-123",
  origin: "Lagos",
  destination: "Dubai",
  departureDate: "2026-11-30T15:30:00.000Z",
  travelerCount: 2,
  confirmedAt: "2026-10-28T10:00:00.000Z",
};
const render = (trips: Trip[], now = new Date("2026-10-28T14:00:00.000Z")) =>
  renderToStaticMarkup(createElement(RecentConfirmedTripTable, { trips, now }));

test("recent confirmed trips preserve every original field and link to existing record details", () => {
  const html = render([sample]);
  for (const field of ["qa@example.invalid", "qa-user-123", "FLIGHT", "Lagos", "Dubai",
    "QA Partner", "QA-REF-123", "2 travelers", "Upcoming"]) {
    assert.ok(html.includes(field), "Missing original trip field: " + field);
  }
  assert.match(html, /dateTime="2026-11-30T15:30:00.000Z"/i);
  assert.match(html, /dateTime="2026-10-28T10:00:00.000Z"/i);
  assert.match(html, /href="\/admin\/confirmed-trips\/records\/qa-confirmed-001"/);
  assert.match(html, /View details/);
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Recent confirmed trips table"/);
  assert.match(html, /tabIndex="0"/i);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /min-w-\[880px\]/);
  assert.equal((html.match(/<th /g) || []).length, 6);
  assert.equal((html.match(/<tbody>/g) || []).length, 1);
  assert.equal((html.match(/View details <svg/g) || []).length, 1);
});

test("status labels use stored provider values and warn only for overdue Upcoming trips", () => {
  const past: Trip = { ...sample, id: "qa-past-002", status: "PAST", providerConfirmationCode: "QA-PAST-002" };
  const cancelled: Trip = { ...sample, id: "qa-cancelled-003", status: "CANCELLED", providerConfirmationCode: "QA-CAN-003" };
  const stale: Trip = { ...sample, id: "qa-stale-004", departureDate: "2026-10-20T12:00:00.000Z" };
  const html = render([sample, past, cancelled, stale]);
  assert.match(html, />Upcoming<\/span>/);
  assert.match(html, />Past<\/span>/);
  assert.match(html, />Cancelled<\/span>/);
  assert.equal((html.match(/Review status freshness/g) || []).length, 1);
  assert.equal((html.match(/\/admin\/confirmed-trips\/records\//g) || []).length, 4);
  assert.doesNotMatch(html, /Cancel booking|Refund|Payment received/);
});

test("recent-trips empty state is compact, truthful and contains no fabricated records", () => {
  const html = render([]);
  assert.match(html, /role="status"/);
  assert.match(html, /No provider-confirmed trips yet/);
  assert.match(html, /No signed provider confirmations have been accepted yet./);
  assert.doesNotMatch(html, /<table|<tbody|View details|QA Partner|qa@example\.invalid/);
});

test("customer email fallback, missing origin and long references remain readable", () => {
  const html = render([{
    ...sample, id: "qa-missing-email-005", userEmail: null, origin: null,
    providerConfirmationCode: "LONG-REFERENCE-009-COMPANY",
    travelerCount: 1,
  }]);
  assert.match(html, /Email unavailable/);
  assert.match(html, />Dubai<\/p>/);
  assert.match(html, /1 traveler<\/p>/);
  assert.match(html, /LONG-REFERENCE-009-COMPANY/);
  assert.match(html, /break-all/);
});
