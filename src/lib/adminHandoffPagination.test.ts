import assert from "node:assert/strict";
import test from "node:test";
import { handoffNextPageHref, handoffPreviousPageHref } from "./adminHandoffPagination";

test("handoff cursor navigation preserves current filters and returns to first page", () => {
  const raw = { provider: "KAYAK sandbox", product: "HOTEL", sourcePage: "/hotel_details",
    environment: "staging", from: "2026-10-01T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z" };
  const next = new URL(handoffNextPageHref(raw, "cursorA"), "https://internal.test");
  assert.equal(next.searchParams.get("cursor"), "cursorA");
  assert.equal(next.searchParams.get("provider"), raw.provider);
  assert.equal(next.searchParams.get("sourcePage"), raw.sourcePage);
  assert.equal(next.searchParams.get("pageTrail"), "first");
  const previous = new URL(handoffPreviousPageHref(Object.fromEntries(next.searchParams))!, "https://internal.test");
  assert.equal(previous.searchParams.has("cursor"), false);
  assert.equal(previous.searchParams.has("pageTrail"), false);
  assert.equal(previous.searchParams.get("provider"), raw.provider);
});

test("handoff pagination reverses multiple cursor steps without replacing filters", () => {
  const first = new URL(handoffNextPageHref({ environment: "production" }, "cursorA"), "https://internal.test");
  const second = new URL(handoffNextPageHref(Object.fromEntries(first.searchParams), "cursorB"), "https://internal.test");
  assert.equal(second.searchParams.get("pageTrail"), "first.cursorA");
  const back = new URL(handoffPreviousPageHref(Object.fromEntries(second.searchParams))!, "https://internal.test");
  assert.equal(back.searchParams.get("cursor"), "cursorA");
  assert.equal(back.searchParams.get("pageTrail"), "first");
  assert.equal(handoffPreviousPageHref({}), null);
});

test("long cursor history is bounded by length without losing previous navigation", () => {
  let raw: Record<string, string> = { environment: "staging" };
  for (let i = 0; i < 21; i++) {
    const token = "C".repeat(510) + String(i);
    const next = new URL(handoffNextPageHref(raw, token), "https://internal.test");
    assert.ok((next.searchParams.get("pageTrail") || "").length <= 8192);
    raw = Object.fromEntries(next.searchParams);
  }
  const previous = handoffPreviousPageHref(raw);
  assert.ok(previous);
  assert.equal(new URL(previous!, "https://internal.test").searchParams.has("cursor"), true);
});
