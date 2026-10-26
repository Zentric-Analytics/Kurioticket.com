import assert from "node:assert/strict";
import test from "node:test";
import { searchActivityDetailQuery, searchActivityReturnHref } from "./adminSearchActivityNavigation";

test("return to the exact selected Search activity filters", () => {
  const raw = { range: "7d", product: "HOTEL", status: "FAILED", identity: "guest", provider: "KAYAK sandbox", environment: "staging" };
  const query = searchActivityDetailQuery(raw);
  assert.equal(searchActivityReturnHref(Object.fromEntries(new URLSearchParams(query))), "/admin/searches/activity?" + query);
  assert.equal(new URLSearchParams(query).get("range"), "7d");
  assert.equal(new URLSearchParams(query).get("provider"), "KAYAK sandbox");
});

test("detail return navigation cannot accept redirect destinations or unexpected query fields", () => {
  const href = searchActivityReturnHref({ range: "30d", next: "https://example.com", returnTo: "/admin/system", from: "2026-10-01T00:00:00.000Z" });
  assert.equal(href, "/admin/searches/activity?range=30d&from=2026-10-01T00%3A00%3A00.000Z");
});

test("unfiltered search still returns with the selected default range", () => {
  assert.equal(searchActivityDetailQuery({}, "today"), "range=today");
});
