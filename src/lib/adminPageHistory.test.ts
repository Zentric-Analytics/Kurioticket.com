import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { pageHistoryBackHref, pageHistoryFiltersKey, pageHistoryHref, pageHistoryHrefFromActivity, pageHistoryPlatformValues, parsePageHistoryQuery, recentPageViews } from "./adminPageHistory";
import type { ActivityRow } from "./adminIdentityJourney";

const now = new Date("2026-11-24T16:40:00.000Z");
const activityPath = "/admin/users/user/qa-account-0001/activity";
const historyPath = "/admin/users/user/qa-account-0001/pages";

test("page visit summaries keep the latest recorded visit without mutating the input", () => {
  const rows: ActivityRow[] = Array.from({length: 12}, (_, i) => ({
    id: "e-qa-page-" + i, at: new Date(+now - (11 - i) * 1000), stage: "PAGE_VIEW",
    label: "Support", detail: "/support", pageView: { path: "/support", previousPath: null, transport: "native", platform: "iOS app", href: null },
  }));
  rows.push({ id: "s-qa-other", at: now, stage: "SEARCH_COMPLETED", label: "Search", detail: "Search" });
  assert.deepEqual(recentPageViews(rows).map(row => row.id), [11].map(i => "e-qa-page-" + i));
  assert.equal(rows.length, 13);
  assert.equal(rows[0].id, "e-qa-page-0");
});

test("history defaults to Today and preserves inherited filters and a stable paging window", () => {
  const today = parsePageHistoryQuery({}, now);
  assert.ok(today.ok);
  assert.equal(today.query.range, "today");
  assert.equal(today.query.filters.from, "2026-11-24T00:00:00.000Z");
  assert.equal(today.query.filters.to, now.toISOString());
  const all = parsePageHistoryQuery({ range: "all", platform: "ios", page: "2", q: "Support", product: "CAR" }, now);
  assert.ok(all.ok);
  const href = pageHistoryHref(historyPath, all.query, activityPath);
  const url = new URL(href, "https://staging.kurioticket.com");
  const roundtrip = parsePageHistoryQuery(Object.fromEntries(url.searchParams), new Date(+now + 5000));
  assert.deepEqual(roundtrip, all);
  assert.equal(url.searchParams.get("activityReturn"), activityPath);
  assert.deepEqual(pageHistoryPlatformValues("ios"), ["iOS app", "iOS app (reported)"]);
});

test("full history navigation restores the exact activity tab and filters for the same identity only", () => {
  const returnHref = activityPath + "?tab=pages&range=custom&from=2026-11-01&to=2026-11-24&q=Support&directory=role%3DALL";
  const href = pageHistoryHrefFromActivity("user", "qa-account-0001",
    { tab: "pages", stage: "all", product: "all", from: "2026-11-01", to: "2026-11-24", q: "Support" }, "custom", returnHref);
  const url = new URL(href, "https://staging.kurioticket.com");
  assert.equal(url.pathname, historyPath);
  assert.equal(url.searchParams.get("range"), "custom");
  assert.equal(url.searchParams.get("q"), "Support");
  const restored = pageHistoryBackHref("user", "qa-account-0001", url.searchParams.get("activityReturn"));
  assert.deepEqual(Object.fromEntries(new URL(restored, url.origin).searchParams), Object.fromEntries(new URL(returnHref, url.origin).searchParams));
  for (const unsafe of ["https://example.invalid/", "/admin/users/user/other-account/activity", "/admin/users/guest/qa-account-0001/activity", activityPath + "/other", activityPath + "?q=x#bad"]) {
    assert.equal(pageHistoryBackHref("user", "qa-account-0001", unsafe), activityPath);
  }
});

test("invalid date, page and platform filters cannot broaden the history", () => {
  for (const raw of [{ range: "invalid" }, { platform: "fake" }, { page: "0" }, { page: "1e3" }, { page: "1000001" },
    { range: "custom" }, { from: "2026-02-30" }, { platform: ["ios", "android"] }]) {
    assert.equal(parsePageHistoryQuery(raw, now).ok, false);
  }
});

test("preset Page History entries refresh while older pages keep their exact snapshot across midnight", () => {
  const firstAt = new Date("2026-11-26T23:59:50.000Z");
  const refreshedAt = new Date("2026-11-27T00:00:10.000Z");
  for (const kind of ["user", "guest"] as const) {
    for (const range of ["all", "today", "24h", "7d", "30d"]) {
      const first = parsePageHistoryQuery({ range, platform: "android", product: "FLIGHT", q: "Support" }, firstAt);
      assert.ok(first.ok);
      const returnHref = "/admin/users/" + kind + "/qa-identity-0001/activity/all?range=" + range;
      const entry = new URL(pageHistoryHrefFromActivity(kind, "qa-identity-0001", first.query.filters, range, returnHref), "https://kurioticket.test");
      assert.equal(entry.searchParams.has("from"), false);
      assert.equal(entry.searchParams.has("to"), false);
      const refreshed = parsePageHistoryQuery(Object.fromEntries(entry.searchParams), refreshedAt);
      assert.ok(refreshed.ok);
      assert.equal(refreshed.query.filters.to, refreshedAt.toISOString());
      if (range === "today") assert.equal(refreshed.query.filters.from, "2026-11-27T00:00:00.000Z");
      const second = new URL(pageHistoryHref(entry.pathname, { ...first.query, page: 2 }, returnHref), entry.origin);
      const continued = parsePageHistoryQuery(Object.fromEntries(second.searchParams), refreshedAt);
      assert.ok(continued.ok);
      assert.deepEqual(continued.query, { ...first.query, page: 2 });
      assert.equal(pageHistoryBackHref(kind, "qa-identity-0001", second.searchParams.get("activityReturn")), returnHref);
      const newest = new URL(pageHistoryHref(entry.pathname, { ...continued.query, page: 1 }, returnHref), entry.origin);
      assert.equal(newest.searchParams.has("from"), false);
      assert.equal(newest.searchParams.has("to"), false);
    }
  }
});

test("Page History custom timestamps survive entry, refresh and numbered pagination exactly", () => {
  const from = "2026-11-23T12:05:06.123Z";
  const to = "2026-11-24T13:15:16.456Z";
  const filters = { tab: "pages" as const, stage: "all" as const, product: "all" as const, from, to, q: "" };
  for (const range of ["custom", undefined]) {
    const entry = new URL(pageHistoryHrefFromActivity("user", "qa-account-0001", filters, range, activityPath), "https://kurioticket.test");
    assert.equal(entry.searchParams.get("range"), "custom");
    assert.equal(entry.searchParams.get("from"), from);
    assert.equal(entry.searchParams.get("to"), to);
    const parsed = parsePageHistoryQuery(Object.fromEntries(entry.searchParams), now);
    assert.ok(parsed.ok);
    const second = new URL(pageHistoryHref(historyPath, { ...parsed.query, page: 2 }, activityPath), entry.origin);
    const refreshed = parsePageHistoryQuery(Object.fromEntries(second.searchParams), new Date(+now + 60_000));
    assert.ok(refreshed.ok);
    assert.equal(refreshed.query.filters.from, from);
    assert.equal(refreshed.query.filters.to, to);
  }
});

test("materialized first-page Page History presets advance, while legacy absolute bookmarks stay exact", () => {
  const later = new Date(+now + 120_000);
  for (const range of ["all", "today", "24h", "7d", "30d"]) {
    const first = parsePageHistoryQuery({ range }, now);
    assert.ok(first.ok);
    const raw = { range, from: first.query.filters.from, to: first.query.filters.to, page: "1" };
    const refreshed = parsePageHistoryQuery(raw, later);
    assert.ok(refreshed.ok);
    assert.equal(refreshed.query.filters.to, later.toISOString());
    const continuation = parsePageHistoryQuery({ ...raw, page: "2" }, later);
    assert.ok(continuation.ok);
    assert.equal(continuation.query.filters.to, first.query.filters.to);
    assert.equal(parsePageHistoryQuery({ ...raw, from: "invalid" }, later).ok, false);
  }
  const explicit = { from: "2026-11-23T12:05:06.123Z", to: "2026-11-24T13:15:16.456Z" };
  const legacy = parsePageHistoryQuery(explicit, later);
  assert.ok(legacy.ok);
  assert.equal(legacy.query.range, "custom");
  assert.equal(legacy.query.filters.from, explicit.from);
  assert.equal(legacy.query.filters.to, explicit.to);
});

test("a fresh Page History observation does not reset drafts; changed applied scope does", () => {
  const first = parsePageHistoryQuery({ range: "all", q: "Support" }, now);
  const later = parsePageHistoryQuery({ range: "all", q: "Support" }, new Date(+now + 60_000));
  assert.ok(first.ok && later.ok);
  assert.notEqual(first.query.filters.to, later.query.filters.to);
  assert.equal(pageHistoryFiltersKey(first.query, "UTC"), pageHistoryFiltersKey(later.query, "UTC"));
  assert.equal(pageHistoryFiltersKey(first.query, "UTC"), pageHistoryFiltersKey({ ...first.query, page: 2 }, "UTC"));
  assert.notEqual(pageHistoryFiltersKey(first.query, "UTC"), pageHistoryFiltersKey({ ...first.query, platform: "ios" }, "UTC"));
  assert.notEqual(pageHistoryFiltersKey(first.query, "UTC"), pageHistoryFiltersKey({ ...first.query, filters: { ...first.query.filters, q: "Flights" } }, "UTC"));
  assert.notEqual(pageHistoryFiltersKey(first.query, "UTC"), pageHistoryFiltersKey(first.query, "Africa/Lagos"));
  const custom = parsePageHistoryQuery({ range: "custom", from: "2026-11-23", to: "2026-11-24" }, now);
  assert.ok(custom.ok);
  assert.notEqual(pageHistoryFiltersKey(custom.query, "UTC"), pageHistoryFiltersKey({ ...custom.query, filters: { ...custom.query.filters, to: "2026-11-25" } }, "UTC"));
});

test("the dedicated history requires admin access and both activity summaries stay compact", () => {
  const history = readFileSync("src/app/admin/users/[kind]/[id]/pages/page.tsx", "utf8");
  const activity = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const overview = readFileSync("src/components/admin/AdminActivityOverview.tsx", "utf8");
  assert.match(history, /await requireAdminSession\(path\)/);
  assert.match(history, /Back to Activity/);
  assert.match(history, /page: query\.page, platform: query\.platform/);
  assert.match(history, /key=\{pageHistoryFiltersKey\(query, timeZone\)\}/);
  assert.match(activity, /loadAdminIdentityActivity\(kind, id, filters, undefined, "summary", undefined, canReadAdminAudit\)/);
  assert.match(activity, /summary=\{data\.summary\}/);
  assert.doesNotMatch(activity, /loadAdminIdentityActivity\(kind, id, pageFilters/);
  assert.match(activity, /pageFilters: ActivityFilters = \{ \.\.\.filters, tab: "pages", stage: "all", product: "all", q: "", order: "newest" \}/);
  const unified = readFileSync("src/components/admin/AdminUnifiedActivityList.tsx", "utf8");
  assert.match(activity, /<AdminUnifiedActivityList/);
  assert.doesNotMatch(activity, /<PageViewRecords|<AdminIdentityDeviceAccess/);
  assert.match(unified, /slice\(0, 5\)/);
  assert.doesNotMatch(unified, /pages.slice|travel.slice/);
  assert.match(unified, /View all activity/);
  assert.match(unified, /Rental offer count unavailable/);
  assert.doesNotMatch(unified, /carResultAccounting|carOfferCount/);
  assert.doesNotMatch(overview, /PageViewRecords/);
});
