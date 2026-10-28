import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { jsx: { runtime: "automatic" }, fsCache: false });
const { ConfirmedTripRecordsTable } = jiti("./ConfirmedTripRecordsTable") as typeof import("./ConfirmedTripRecordsTable");

type Row = Parameters<typeof ConfirmedTripRecordsTable>[0]["rows"][number];
const row: Row = {
  id: "qa-trip-001",
  userId: "qa-user-100",
  userEmail: "qa@example.invalid",
  tripType: "FLIGHT",
  status: "UPCOMING",
  providerName: "QA partner",
  providerConfirmationCode: "QA-REF-123",
  providerTripId: "qa-provider-trip",
  origin: "Lagos",
  destination: "Dubai",
  departureDate: "2026-12-10T12:00:00.000Z",
  returnDate: null,
  travelerCount: 2,
  confirmedAt: "2026-10-28T10:00:00.000Z",
  createdAt: "2026-10-28T10:00:00.000Z",
  updatedAt: "2026-10-28T10:00:00.000Z",
  currency: "USD",
  totalAmount: null,
  needsStatusReview: false,
};
const render = (rows: Row[]) => renderToStaticMarkup(createElement(ConfirmedTripRecordsTable, { rows }));

test("compact record table preserves authentic customer, trip, provider, timestamps and details link", () => {
  const html = render([row]);
  for (const field of ["qa@example.invalid", "qa-user-100", "FLIGHT", "Lagos", "Dubai", "2 travelers", "QA partner", "QA-REF-123", "Upcoming"]) {
    assert.ok(html.includes(field), "Missing source field: " + field);
  }
  assert.match(html, /dateTime="2026-12-10T12:00:00.000Z"/i);
  assert.match(html, /dateTime="2026-10-28T10:00:00.000Z"/i);
  assert.match(html, /href="\/admin\/confirmed-trips\/records\/qa-trip-001"/);
  assert.match(html, /View details/);
  assert.match(html, /role="region"/);
  assert.match(html, /aria-label="Matching confirmed trip records"/);
  assert.match(html, /tabIndex="0"/i);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /min-w-\[920px\]/);
  assert.equal((html.match(/<th /g) || []).length, 6);
});

test("stored statuses and stale-status warnings remain truthful and read-only", () => {
  const rows: Row[] = [
    row,
    { ...row, id: "qa-trip-002", status: "PAST" },
    { ...row, id: "qa-trip-003", status: "CANCELLED" },
    { ...row, id: "qa-trip-004", needsStatusReview: true },
  ];
  const html = render(rows);
  for (const text of ["Upcoming", "Past", "Cancelled", "Review status freshness"]) assert.ok(html.includes(text));
  assert.equal((html.match(/Review status freshness/g) || []).length, 1);
  assert.equal((html.match(/href="\/admin\/confirmed-trips\/records\//g) || []).length, 4);
  assert.doesNotMatch(html, /Cancel booking|Refund now|Issue ticket/);
});

test("no records create no fake trip rows or detail destinations", () => {
  const html = render([]);
  assert.match(html, /Matching confirmed trip records/);
  assert.doesNotMatch(html, /QA partner|qa@example\.invalid|View details|<tr[^>]*class="align-top/);
});

test("long and unavailable customer fields wrap without changing the underlying data", () => {
  const html = render([{ ...row, id: "qa-trip-005", userEmail: null, origin: null, providerConfirmationCode: "LONG-CONFIRMATION-CODE-WITH-UNBROKEN-STRING", travelerCount: 1 }]);
  assert.match(html, /Email unavailable/);
  assert.match(html, /LONG-CONFIRMATION-CODE-WITH-UNBROKEN-STRING/);
  assert.match(html, /1 traveler/);
  assert.match(html, /break-all/);
});
