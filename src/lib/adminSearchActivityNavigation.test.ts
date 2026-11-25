import assert from "node:assert/strict";
import test from "node:test";
import { resolveSearchActivityLegacyFilters, searchActivityDetailQuery, searchActivityReturnHref } from "./adminSearchActivityNavigation";

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

test("viewer timezone survives search detail and back navigation", () => {
  const raw = { range: "today", viewerTimeZone: "Africa/Lagos", product: "FLIGHT" };
  const query = searchActivityDetailQuery(raw);
  assert.equal(new URLSearchParams(query).get("viewerTimeZone"), "Africa/Lagos");
  assert.equal(searchActivityReturnHref(Object.fromEntries(new URLSearchParams(query))), "/admin/searches/activity?" + query);
});

test("a former Bot platform bookmark moves to Bot identity and preserves other filters", () => {
  const raw = {
    applicationSource: "BOT", identity: "all", range: "custom", viewerTimeZone: "Africa/Lagos",
    from: "2026-10-01T00:00:00.000Z", to: "2026-10-03T00:00:00.000Z", product: "FLIGHT", status: "PARTIAL",
  };
  const result = resolveSearchActivityLegacyFilters(raw);
  assert.equal(result?.kind, "redirect");
  assert.ok(result);
  assert.deepEqual(Object.fromEntries(new URL(result.href, "https://example.com").searchParams), {
    ...Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "applicationSource")),
    identity: "bot",
  });
  assert.equal(resolveSearchActivityLegacyFilters({ ...raw, identity: "guest" })?.kind, "unsupported");
  assert.equal(resolveSearchActivityLegacyFilters({ ...raw, provider: ["one", "two"] }), null);
});

test("legacy Unattributed links offer explicit recovery and retain other filters", () => {
  const result = resolveSearchActivityLegacyFilters({ identity: "unattributed", applicationSource: "IOS", range: "7d" });
  assert.equal(result?.kind, "unsupported");
  assert.equal(result?.href, "/admin/searches/activity?applicationSource=IOS&range=7d");
});

test("legacy missing-source drill-down keeps its restriction through detail and back navigation", () => {
  const raw = { applicationSource: "UNKNOWN", range: "custom", from: "2026-10-01T00:00:00.000Z" };
  assert.equal(resolveSearchActivityLegacyFilters(raw), null);
  const detailQuery = searchActivityDetailQuery(raw);
  assert.equal(new URLSearchParams(detailQuery).get("applicationSource"), "UNKNOWN");
  assert.equal(searchActivityReturnHref(Object.fromEntries(new URLSearchParams(detailQuery))), "/admin/searches/activity?" + detailQuery);
});
