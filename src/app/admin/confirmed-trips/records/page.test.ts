import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directory = readFileSync("src/app/admin/confirmed-trips/records/page.tsx", "utf8");
const details = readFileSync("src/app/admin/confirmed-trips/records/[id]/page.tsx", "utf8");
const service = readFileSync("src/services/adminConfirmedTripsDirectoryService.ts", "utf8");
const overview = readFileSync("src/app/admin/confirmed-trips/page.tsx", "utf8");

test("admin-only trip directory and detail routes are read-only", () => {
  assert.match(directory, /await requireAdminSession\("\/admin\/confirmed-trips\/records"\)/);
  assert.match(details, /await requireAdminSession\("\/admin\/confirmed-trips\/records\/"/);
  assert.match(directory, /parseAdminTripFilters\(raw\)/);
  assert.match(directory, /listAdminConfirmedTrips\(filters,/);
  assert.match(details, /getAdminConfirmedTripDetails\(id\)/);
  assert.match(details, /if \(result\.status === "not_found"\) notFound\(\)/);
  assert.doesNotMatch(directory + details, /fetch\(|method:\s*["'](?:POST|PATCH|DELETE)|<form[^>]*method="post"/);
  assert.match(overview, /href="\/admin\/confirmed-trips\/records"/);
});

test("queries use only signed confirmations, stable keyset paging, bound seek and explicit errors", () => {
  assert.match(service, /source: "PARTNER_CONFIRMATION"/);
  assert.match(service, /partnerConfirmationOccurredAt: \{ not: null \}/);
  assert.match(service, /decodeAdminTripCursor\(rawCursor, filters, environment\)/);
  assert.match(service, /return \{ status: "invalid_cursor" \}/);
  assert.match(service, /orderBy: \[\{ partnerConfirmationOccurredAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(service, /take: ADMIN_CONFIRMED_TRIPS_PAGE_SIZE \+ 1/);
  assert.match(service, /where: seek \? \{ AND: \[where, seek\] \} : where/);
  assert.match(service, /isolationLevel: "RepeatableRead"/);
  assert.match(service, /return \{ status: "unavailable" \}/);
  assert.doesNotMatch(service, /\.create\(|\.update\(|\.delete\(|\.upsert\(/);
  assert.doesNotMatch(service, /getAdminConfirmedTripsOperationsSnapshot/);
});

test("search keeps owner, provider, destination, reference, product, status and date filters", () => {
  for (const item of [
    "providerConfirmationCode", "providerName", "destination", "origin",
    "userId", "user:", "email", "tripType", "status", "tripConfirmationWindow",
  ]) assert.ok(service.includes(item), item);
  assert.match(service, /escapePrismaContainsQuery\(filters\.q\)/);
  assert.match(service, /escapePrismaContainsQuery\(filters\.provider\)/);
  assert.match(directory, /name="q"/);
  assert.match(directory, /name="provider"/);
  assert.match(directory, /name="product"/);
  assert.match(directory, /name="status"/);
  assert.match(directory, /name="from"/);
  assert.match(directory, /name="to"/);
  assert.match(directory, /tripDirectoryHref\(filters, result\.nextCursor\)/);
  assert.match(directory, /View details/);
});

test("trip details never invent history, status, payments or booking authority", () => {
  assert.match(service, /tripNeedsStatusReview\(row, now\)/);
  assert.match(details, /Review status freshness/);
  assert.match(details, /latest stored provider status only/);
  assert.match(details, /not a Kurioticket booking, payment, refund, or cancellation/);
  assert.match(details, /Provider-supplied total/);
  assert.match(details, /Record last updated/);
  assert.doesNotMatch(details, /Refund now|Cancel booking|Issue ticket|Approve payment/);
});
