import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { pageHistoryBackHref, pageHistoryHref, pageHistoryHrefFromActivity, pageHistoryPlatformValues, parsePageHistoryQuery, recentPageViews } from "./adminPageHistory";
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

test("the dedicated history requires admin access and both activity summaries stay compact", () => {
  const history = readFileSync("src/app/admin/users/[kind]/[id]/pages/page.tsx", "utf8");
  const activity = readFileSync("src/app/admin/users/[kind]/[id]/activity/page.tsx", "utf8");
  const overview = readFileSync("src/components/admin/AdminActivityOverview.tsx", "utf8");
  assert.match(history, /await requireAdminSession\(path\)/);
  assert.match(history, /Back to Activity/);
  assert.match(history, /page: query\.page, platform: query\.platform/);
  assert.match(activity, /loadAdminIdentityActivity\(kind, id, filters, undefined, "summary"\)/);
  assert.match(activity, /data\.summary\.pagesVisited/);
  assert.match(activity, /loadAdminIdentityActivity\(kind, id, pageFilters, undefined, "summary"\)/);
  assert.match(activity, /pageFilters: ActivityFilters = \{ \.\.\.filters, tab: "pages", stage: "all", product: "all", q: "", order: "newest" \}/);
  const unified = readFileSync("src/components/admin/AdminUnifiedActivityList.tsx", "utf8");
  assert.match(activity, /<AdminUnifiedActivityList/);
  assert.doesNotMatch(activity, /<PageViewRecords|<AdminIdentityDeviceAccess/);
  assert.match(unified, /pages.slice\(0, 1\)/);
  assert.match(unified, /View all activity/);
  assert.match(unified, /Rental offer count unavailable/);
  assert.doesNotMatch(unified, /carResultAccounting|carOfferCount/);
  assert.doesNotMatch(overview, /PageViewRecords/);
});
