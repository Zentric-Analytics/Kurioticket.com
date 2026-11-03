import assert from "node:assert/strict";
import test from "node:test";
import { handoffDetailHref, handoffReturnHref, referralHandoffHref } from "./adminReferralHandoffNavigation";

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
