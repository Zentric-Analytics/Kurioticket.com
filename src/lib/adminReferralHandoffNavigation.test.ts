import assert from "node:assert/strict";
import test from "node:test";
import { handoffDetailHref, handoffReturnHref, referralAttributionReturnHref, referralHandoffHref } from "./adminReferralHandoffNavigation";
import { providerHandoffFiltersHref, providerHandoffHistoryFilterHref } from "./adminProviderHandoffFilterUrl";
import { handoffNextPageHref, handoffPreviousPageHref } from "./adminHandoffPagination";
import { readFileSync } from "node:fs";

const from = "2026-10-22T00:00:00.000Z";
const to = "2026-11-03T12:00:00.000Z";

test("report drilldowns preserve the server-defined reporting window, environment and provider", () => {
  const url = new URL(referralHandoffHref({
    start: from, end: to, environment: "staging", provider: "KAYAK sandbox", product: "hotel",
  }), "https://example.test");
  assert.equal(url.pathname, "/admin/redirects");
  assert.equal(url.searchParams.get("from"), from);
  assert.equal(url.searchParams.get("to"), to);
  assert.equal(url.searchParams.get("environment"), "staging");
  assert.equal(url.searchParams.get("provider"), "KAYAK sandbox");
  assert.equal(url.searchParams.get("product"), "HOTEL");
});

test("source page and unlinked breakdowns open matching scoped handoff records", () => {
  const source = new URL(referralHandoffHref({
    start: from, end: to, environment: "production", sourcePage: "/hotel_details",
  }), "https://example.test");
  assert.equal(source.searchParams.get("sourcePage"), "/hotel_details");
  const unlinked = new URL(referralHandoffHref({
    start: from, end: to, environment: "production", correlation: "unavailable",
  }), "https://example.test");
  assert.equal(unlinked.searchParams.get("correlation"), "unavailable");
  assert.equal(unlinked.searchParams.get("from"), from);
});

test("detail and back URLs retain only allowed filters, with record environment enforced", () => {
  const raw = { from, to, provider: "Duffel", product: "FLIGHT", correlation: "exact", sourcePage: "/flight_details", cursor: "abc123", environment: "production", danger: "https://evil.test" };
  const detail = new URL(handoffDetailHref("redirect_123", "staging", raw), "https://example.test");
  assert.equal(detail.searchParams.get("environment"), "staging");
  assert.equal(detail.searchParams.has("danger"), false);
  const back = new URL(handoffReturnHref(Object.fromEntries(detail.searchParams)), "https://example.test");
  assert.equal(back.pathname, "/admin/redirects");
  for (const key of ["from", "to", "provider", "product", "correlation", "sourcePage", "cursor"]) {
    assert.equal(back.searchParams.get(key), raw[key as keyof typeof raw]);
  }
  assert.equal(back.searchParams.get("environment"), "staging");
});

test("legitimate pagination history survives detail and back navigation past 2048 characters", () => {
  const trail = Array.from({ length: 7 }, (_, i) => "A".repeat(390) + String(i)).join(".");
  assert.ok(trail.length > 2048 && trail.length < 8192);
  const detail = new URL(handoffDetailHref("redirect_123", "staging", { pageTrail: trail, cursor: "cursorCurrent" }), "https://example.test");
  assert.equal(detail.searchParams.get("pageTrail"), trail);
  const back = new URL(handoffReturnHref(Object.fromEntries(detail.searchParams)), "https://example.test");
  assert.equal(back.searchParams.get("pageTrail"), trail);
});

test("Referral Attribution drilldown returns to the original reporting tab and selected days", () => {
  const handoffs = new URL(referralHandoffHref({
    start: from, end: to, environment: "staging", correlation: "unavailable", referralDays: 14,
  }), "https://example.test");
  assert.equal(handoffs.pathname, "/admin/redirects");
  assert.equal(handoffs.searchParams.get("correlation"), "unavailable");
  assert.equal(handoffs.searchParams.get("from"), from);
  assert.equal(handoffs.searchParams.get("to"), to);
  assert.equal(handoffs.searchParams.get("referralDays"), "14");
  assert.equal(referralAttributionReturnHref(Object.fromEntries(handoffs.searchParams)),
    "/admin/providers?view=attribution&days=14");
});

test("Referral return destination is allowlisted and never accepts arbitrary URLs", () => {
  assert.equal(referralAttributionReturnHref({}), null);
  for (const value of ["", "0", "91", "-1", "1.5", "30x", "//evil.test", "https://evil.test", "001", "999999"]) {
    assert.equal(referralAttributionReturnHref({ referralDays: value }), null, value);
  }
  assert.equal(referralAttributionReturnHref({ referralDays: "90", redirect: "https://evil.test" }),
    "/admin/providers?view=attribution&days=90");
  const nonReport = new URL(referralHandoffHref({
    start: from, end: to, environment: "staging", correlation: "unavailable",
  }), "https://example.test");
  assert.equal(nonReport.searchParams.has("referralDays"), false);
});

test("Referral return context survives handoff filters, pagination and individual details", () => {
  const scope = { userId: "", visitorId: "", from, to, referralDays: "30" };
  const filters = { product: "", provider: "", environment: "staging", identity: "all", correlation: "unavailable" };
  const filtered = new URL(providerHandoffFiltersHref({ ...filters, product: "FLIGHT" }, scope), "https://example.test");
  assert.equal(filtered.searchParams.get("referralDays"), "30");
  assert.equal(filtered.searchParams.get("correlation"), "unavailable");
  assert.equal(filtered.searchParams.get("from"), from);
  assert.equal(providerHandoffHistoryFilterHref(filtered.search).includes("referralDays=30"), true);

  const next = new URL(handoffNextPageHref(Object.fromEntries(filtered.searchParams), "cursor1"), "https://example.test");
  assert.equal(next.searchParams.get("referralDays"), "30");
  const previous = new URL(handoffPreviousPageHref(Object.fromEntries(next.searchParams))!, "https://example.test");
  assert.equal(previous.searchParams.get("referralDays"), "30");
  const detail = new URL(handoffDetailHref("redirect_123", "staging", Object.fromEntries(next.searchParams)), "https://example.test");
  assert.equal(detail.searchParams.get("referralDays"), "30");
  const back = new URL(handoffReturnHref(Object.fromEntries(detail.searchParams)), "https://example.test");
  assert.equal(back.searchParams.get("referralDays"), "30");
  assert.equal(back.searchParams.get("cursor"), "cursor1");
  assert.equal(referralAttributionReturnHref(Object.fromEntries(back.searchParams)),
    "/admin/providers?view=attribution&days=30");
});

test("Handoff reader strips return-only query metadata without changing its database query contract", () => {
  const handoffsPage = readFileSync("src/app/admin/redirects/page.tsx", "utf8");
  const referralPage = readFileSync("src/app/admin/referral-attribution/page.tsx", "utf8");
  assert.match(handoffsPage, /if \(key === "pageTrail" \|\| key === "referralDays"\) continue/);
  assert.match(handoffsPage, /aria-label="Return to Referral Attribution"/);
  assert.match(handoffsPage, /referralReturnHref \? \(/);
  assert.match(handoffsPage, /referralDays: one\(raw\.referralDays\)/);
  assert.match(referralPage, /correlation: "unavailable", referralDays: days/);
});
