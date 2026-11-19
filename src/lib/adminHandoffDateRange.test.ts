import assert from "node:assert/strict";
import test from "node:test";
import { resolveHandoffDateRange, withHandoffDateScope } from "./adminHandoffDateRange";
import { handoffNextPageHref, handoffPreviousPageHref } from "./adminHandoffPagination";
import { handoffDetailHref, handoffReturnHref } from "./adminReferralHandoffNavigation";
import { parseAdminHandoffQuery } from "@/services/adminOperationalReadContract";
import { buildHandoffProviderOptions } from "./adminHandoffProviderOptions";

const now = new Date("2026-11-18T17:48:00.000Z");

test("Last 24 hrs is default; legacy Today, 7/30 days and all-time still work", () => {
  assert.deepEqual(resolveHandoffDateRange({}, now), {
    range: "24h", from: "2026-11-17T17:48:00.000Z", to: null,
  });
  assert.deepEqual(resolveHandoffDateRange({ range: "today" }, now), {
    range: "today", from: "2026-11-18T00:00:00.000Z", to: null,
  });
  assert.deepEqual(resolveHandoffDateRange({ range: "7d" }, now), {
    range: "7d", from: "2026-11-11T17:48:00.000Z", to: null,
  });
  assert.deepEqual(resolveHandoffDateRange({ range: "30d" }, now), {
    range: "30d", from: "2026-10-19T17:48:00.000Z", to: null,
  });
  assert.deepEqual(resolveHandoffDateRange({ range: "all" }, now), {
    range: "all", from: null, to: null,
  });
});

test("Explicit referral investigation dates stay Custom, not overwritten by Today", () => {
  const from = "2026-10-01T00:00:00.000Z";
  const to = "2026-10-08T00:00:00.000Z";
  const input = { provider: "KAYAK sandbox", environment: "staging", from, to };
  const scoped = withHandoffDateScope(input, now);
  assert.equal(scoped.range, "custom");
  assert.equal(scoped.from, from);
  assert.equal(scoped.to, to);
  const backendParams = new URLSearchParams();
  for (const [key, value] of Object.entries(scoped)) if (key !== "range" && typeof value === "string") backendParams.set(key, value);
  assert.equal(parseAdminHandoffQuery(backendParams, "staging").status, "ok");
});

test("A materialized rolling window remains stable across pagination and detail links", () => {
  const from = "2026-11-11T17:48:00.000Z";
  const scoped = withHandoffDateScope({ range: "7d", provider: "KAYAK sandbox", environment: "staging", from }, now);
  assert.equal(scoped.from, from);
  const next = new URL(handoffNextPageHref(scoped, "cursor_123"), "https://example.invalid");
  assert.equal(next.searchParams.get("range"), "7d");
  assert.equal(next.searchParams.get("from"), from);
  assert.equal(next.searchParams.get("provider"), "KAYAK sandbox");
  assert.equal(next.searchParams.get("environment"), "staging");

  const detail = new URL(handoffDetailHref("handoff_123", "staging", Object.fromEntries(next.searchParams)), "https://example.invalid");
  assert.equal(detail.searchParams.get("range"), "7d");
  const returned = new URL(handoffReturnHref(Object.fromEntries(detail.searchParams)), "https://example.invalid");
  assert.equal(returned.searchParams.get("from"), from);
  assert.equal(returned.searchParams.get("range"), "7d");
  assert.equal(returned.searchParams.get("provider"), "KAYAK sandbox");

  const previous = handoffPreviousPageHref(Object.fromEntries(next.searchParams));
  assert.ok(previous);
  assert.equal(new URL(previous, "https://example.invalid").searchParams.get("range"), "7d");
});

test("Historical provider names remain available in the integration-backed dropdown", () => {
  const options = buildHandoffProviderOptions(
    [{ provider: "Duffel" }, { provider: "KAYAK sandbox" }, { provider: "duffel" }],
    "Legacy Provider",
  );
  assert.deepEqual(options.map(option => option.label), ["All providers", "Duffel", "KAYAK sandbox", "Legacy Provider"]);
  assert.equal(options.at(-1)?.value, "Legacy Provider");
  const selected = buildHandoffProviderOptions([{ provider: "KAYAK sandbox" }], "kayak SANDBOX");
  assert.equal(selected[1].value, "kayak SANDBOX");
  assert.equal(selected[1].label, "KAYAK sandbox");
});
