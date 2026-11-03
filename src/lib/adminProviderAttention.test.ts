import assert from "node:assert/strict";
import test from "node:test";

import { parseProviderHealthHours, parseProviderHealthRange, providerHealthRangeHref, providerHealthHref, providerHealthWindows, providerSearchActivityHref } from "./adminProviderAttention";

test("provider health supports only the bounded monitoring windows", () => {
  assert.deepEqual(providerHealthWindows.map(window => window.hours), [24, 72, 168]);
  assert.equal(parseProviderHealthHours(undefined), 24);
  assert.equal(parseProviderHealthHours("72"), 72);
  assert.equal(parseProviderHealthHours("168"), 168);
  for (const input of ["0", "169", "1", "all", "Infinity", ["168"]]) {
    assert.equal(parseProviderHealthHours(input), 24);
  }
});

test("provider health window navigation preserves product and current default", () => {
  assert.equal(providerHealthHref(24, "all"), "/admin/providers");
  assert.equal(providerHealthHref(72, "all"), "/admin/providers?hours=72");
  assert.equal(providerHealthHref(168, "hotels"), "/admin/providers?product=hotels&hours=168");
  assert.equal(providerHealthHref(24, "flights"), "/admin/providers?product=flights");
});

test("search investigation URLs scope search creation dates, not provider-call timestamps", () => {
  const until = new Date("2026-11-03T12:00:00.000Z");
  const url = new URL(providerSearchActivityHref({ provider: "KAYAK sandbox", product: "HOTEL", hours: 72, until }), "https://example.test");
  assert.equal(url.pathname, "/admin/searches/activity");
  assert.equal(url.searchParams.get("range"), "custom");
  assert.equal(url.searchParams.get("from"), "2026-10-31T12:00:00.000Z");
  assert.equal(url.searchParams.get("to"), "2026-11-03T12:00:00.000Z");
  assert.equal(url.searchParams.get("provider"), "KAYAK sandbox");
  assert.equal(url.searchParams.get("product"), "HOTEL");
  assert.equal(url.searchParams.has("status"), false);
});

test("custom monitoring date windows include full UTC dates, bound history, and preserve product", () => {
  const now = new Date("2026-11-03T12:00:00.000Z");
  const valid = parseProviderHealthRange({ period: "custom", from: "2026-11-01", to: "2026-11-03" }, now);
  assert.equal(valid.error, null);
  assert.equal(valid.range?.from.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(valid.range?.to.toISOString(), now.toISOString());
  const url = new URL(providerHealthRangeHref("flights", valid.range, valid.hours), "https://example.test");
  assert.equal(url.searchParams.get("product"), "flights");
  assert.equal(url.searchParams.get("period"), "custom");
  assert.equal(url.searchParams.get("from"), "2026-11-01");
  assert.equal(url.searchParams.get("to"), "2026-11-03");
  assert.equal(parseProviderHealthRange({ period: "custom", from: "2026-01-01", to: "2026-11-03" }, now).range, null);
  assert.equal(parseProviderHealthRange({ period: "custom", from: "2026-11-04", to: "2026-11-05" }, now).range, null);
  assert.equal(parseProviderHealthRange({ period: "custom", from: "2026-11-03" }, now).range, null);
  assert.equal(parseProviderHealthRange({ period: "custom", from: "2026-11-02", to: "2026-11-01" }, now).range, null);
  assert.equal(parseProviderHealthRange({ period: "custom", from: "2026-02-30", to: "2026-03-01" }, now).range, null);
  assert.equal(parseProviderHealthRange({ hours: "72" }, now).hours, 72);
});
