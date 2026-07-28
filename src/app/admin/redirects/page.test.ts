import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildRedirectsHref, buildRedirectsWhere, formatDestinationDomain, formatSourcePage, parseRedirectsSearchParams, redirectsTableColumns } from "./page-data";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const toolbar = readFileSync(new URL("./RedirectsFilterToolbar.tsx", import.meta.url), "utf8");

test("provider handoffs uses the focused header and inline filter toolbar", () => {
  assert.doesNotMatch(page, /Admin Operations/);
  assert.match(page, /eyebrow="" title="Provider Handoffs"/);
  assert.match(toolbar, /Search route or domain\.\.\./);
  assert.match(toolbar, /name="provider"/);
  assert.match(toolbar, /name="status"/);
  assert.match(toolbar, /RotateCcw/);
  assert.match(toolbar, /Clear filters/);
  assert.doesNotMatch(toolbar, /AdminFilterBar/);
});

test("table retains the read-only operational fields and presentation", () => {
  assert.deepEqual(redirectsTableColumns, ["Route", "Provider", "Source Page", "Destination Domain", "Status", "Created"]);
  assert.match(page, /Showing \{first\}–\{last\} of \{data\.total\} handoffs/);
  assert.match(page, /redirect\.type\.toLowerCase/);
  assert.match(page, /AdminStatusBadge[^>]*>Recorded/);
  assert.doesNotMatch(page, /Manage|Delete|Edit|Bulk/);
});

test("source-page values become readable without changing stored data", () => {
  const stored = "hotel_results";
  assert.equal(formatSourcePage(stored), "Hotel Results");
  assert.equal(stored, "hotel_results");
  assert.equal(formatSourcePage("flight_results"), "Flight Results");
  assert.equal(formatSourcePage("unusual_source-page"), "Unusual Source Page");
});

test("destination formatting presents only a clean domain and preserves its input", () => {
  const destination = "https://www.example.com/path?affiliate=kurioticket";
  assert.equal(formatDestinationDomain(destination), "example.com");
  assert.equal(destination, "https://www.example.com/path?affiliate=kurioticket");
  assert.equal(formatDestinationDomain("www.google.com/results?q=flight"), "google.com");
  assert.match(page, /title=\{redirect\.destinationUrl\}/);
});

test("query filters and pagination preserve supported parameters", () => {
  assert.equal(buildRedirectsHref(3, { q: "Lagos", provider: "Booking.com", status: "RECORDED" }), "/admin/redirects?q=Lagos&provider=Booking.com&status=RECORDED&page=3");
  assert.equal(buildRedirectsHref(1, { q: "", provider: "ALL", status: "ALL" }), "/admin/redirects");
  assert.deepEqual(parseRedirectsSearchParams({ page: "invalid" }), { q: "", provider: "ALL", status: "ALL", page: 1 });
  const where = buildRedirectsWhere(parseRedirectsSearchParams({ q: "handoff", provider: "Duffel" }));
  assert.equal(where.provider, "Duffel");
  assert.equal(where.OR?.length, 5);
});

test("database, global-empty, and filtered-empty states remain distinct", () => {
  assert.match(page, /AdminDataErrorState title="Provider handoffs could not be loaded/);
  assert.match(page, /No provider handoffs recorded\./);
  assert.match(page, /No provider handoffs found\./);
  assert.match(page, /data\.all === 0/);
  assert.match(page, /Try another filter or clear the current filters\./);
});
