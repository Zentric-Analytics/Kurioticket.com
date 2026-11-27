import assert from "node:assert/strict";
import test from "node:test";
import { adminActivitySearchHref, adminUsersActivityHref, adminUsersActivityReturn, safeAdminUsersReturnHref } from "./adminUsersNavigation";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "./adminActivityDateQuery";
import { recordedGuestActivityHref } from "./adminLiveGuestActivityNavigation";
import { activityJourneyReturnHref, decodeActivityJourneyReturn, encodeActivityJourneyReturn } from "./adminActivityJourneyNavigation";
import { pageHistoryBackHref } from "./adminPageHistory";
import { adminIdentityDateBounds, parseAdminIdentityDate } from "./adminIdentityDirectory";
import { parseHistoryDirectoryQuery } from "./adminHistoryDirectory";
import { searchDetailReturn } from "./adminSearchActivityNavigation";
import { decodeActivityCursor, encodeActivityCursor, parseActivityFilters } from "./adminIdentityActivity";
import { ADMIN_USERS_DIRECTORY_MAX_PAGE } from "./adminUsersDirectoryPagination";

const origin = "https://admin.example.invalid";
const online = "/admin/users/online?q=Nigeria&type=guest&platform=android&page=3";
const now = new Date("2026-11-27T01:40:00.000Z");

test("Directory stays Today while new user and guest activity opens explicit All time", () => {
  assert.equal(parseAdminIdentityDate(undefined), "today");
  assert.ok(adminIdentityDateBounds("today", now));
  for (const section of ["devices", "pages"] as const) {
    const parsed = parseHistoryDirectoryQuery(section, {});
    assert.ok(parsed.ok);
    assert.equal(parsed.query.range, "today");
  }
  assert.deepEqual(normalizeUserActivityQuery({}, now), { range: "all" });
  for (const kind of ["user", "guest"] as const) {
    const href = adminUsersActivityHref(kind, "qa-identity-0001", "/admin/users?date=today&tab=GUEST&q=Guest&page=2");
    assert.ok(href);
    const url = new URL(href, origin);
    assert.equal(url.searchParams.get("range"), "all");
    assert.equal(adminUsersActivityReturn(Object.fromEntries(url.searchParams)).href,
      "/admin/users?q=Guest&tab=GUEST&date=today&page=2");
  }
  const explicit = { from: "2026-11-25T00:00:00.000Z", to: "2026-11-26T00:00:00.000Z" };
  assert.deepEqual(normalizeUserActivityQuery(explicit, now), { ...explicit, range: "custom" });
  assert.equal(normalizeUserActivityQuery({ range: "today" }, now).from, "2026-11-27T00:00:00.000Z");
  assert.deepEqual(normalizeUserActivityQuery({ range: ["all", "today"] }, now).range, ["all", "today"]);
});

test("Online origin survives live guest resolution and nested history/search/page returns", () => {
  const live = adminUsersActivityHref("live-guest", "x".repeat(43), online);
  assert.ok(live);
  const liveQuery = Object.fromEntries(new URL(live, origin).searchParams);
  const canonical = recordedGuestActivityHref("qa-recorded-guest", false, liveQuery);
  assert.ok(canonical);
  const query = Object.fromEntries(new URL(canonical, origin).searchParams);
  assert.equal(adminUsersActivityReturn(query).label, "Online Users");
  assert.equal(adminUsersActivityReturn(query).href, online);
  assert.equal(safeActivityQueryParams(query).usersReturn, online);
  const historyFilters = {
    range: "all", tab: "searches", q: "Abuja", usersReturn: online,
    from: "2026-11-01T00:00:00.000Z", to: now.toISOString(),
  };
  const parsed = parseActivityFilters(historyFilters);
  assert.ok(parsed.ok);
  const cursor = encodeActivityCursor({ id: "s-qa-search-0001", at: new Date("2026-11-25T12:00:00.000Z") },
    "guest", "qa-recorded-guest", parsed.filters, "staging");
  const full = "/admin/users/guest/qa-recorded-guest/activity/all?" + new URLSearchParams({ ...historyFilters, cursor });
  const preserved = activityJourneyReturnHref(full);
  assert.ok(preserved);
  assert.equal(new URL(preserved, origin).pathname, new URL(full, origin).pathname);
  assert.deepEqual(Object.fromEntries(new URL(preserved, origin).searchParams), Object.fromEntries(new URL(full, origin).searchParams));
  const token = encodeActivityJourneyReturn(full);
  assert.ok(token);
  assert.equal(decodeActivityJourneyReturn(token), preserved);
  assert.equal(pageHistoryBackHref("guest", "qa-recorded-guest", full), preserved);
  const search = new URL(adminActivitySearchHref("qa-search-0001", "staging", full), origin);
  assert.equal(search.searchParams.get("environment"), "staging");
  assert.deepEqual(searchDetailReturn(Object.fromEntries(search.searchParams)), { href: preserved, label: "All activity" });
  const restored = new URL(searchDetailReturn(Object.fromEntries(search.searchParams)).href, origin).searchParams;
  assert.deepEqual(decodeActivityCursor(restored.get("cursor")!, "guest", "qa-recorded-guest", parsed.filters, "staging"),
    { id: "s-qa-search-0001", at: "2026-11-25T12:00:00.000Z" });
  assert.equal(decodeActivityCursor(restored.get("cursor")!, "guest", "another-guest", parsed.filters, "staging"), null);
  const journeys = "/admin/users/guest/qa-recorded-guest/journeys?range=all&activityReturn=" + token;
  const nested = encodeActivityJourneyReturn(journeys);
  assert.ok(nested);
  assert.equal(decodeActivityJourneyReturn(nested), journeys);
});

test("return targets are fixed Users roots and only recognized filters survive", () => {
  for (const value of ["https://other.invalid/admin/users", "//other.invalid/admin/users", "/admin/users/online/../devices",
    "/admin/users/online#bad", "/admin/users/online?type=guest&type=registered", "/admin/users?role=OWNER",
    "/admin/users?date=custom&from=2026-02-30&to=2026-03-01", "/admin/users?date=custom", "/admin/users?q=%0A",
    "/admin/users/user/qa-user-001/activity", "/admin/users/pages?page=0", "/admin/users/online?page=1?redirect=bad",
    "/admin/users\\online", [online]]) assert.equal(safeAdminUsersReturnHref(value), null, String(value));
  assert.equal(safeAdminUsersReturnHref(online + "&redirect=https://other.invalid&environment=production"), online);
  assert.deepEqual(adminUsersActivityReturn({ usersReturn: "https://other.invalid", directory: "q=Guest&tab=GUEST&date=today&page=2" }),
    { href: "/admin/users?q=Guest&tab=GUEST&date=today&page=2", label: "Users directory" });
  assert.deepEqual(adminUsersActivityReturn({ usersReturn: [online] }), { href: "/admin/users", label: "Users directory" });
  assert.equal(adminUsersActivityHref("live-guest", "guest-1", online), null);
  assert.equal(adminUsersActivityHref("guest", "../someone", online), null);
  assert.equal(adminUsersActivityHref("user", "qa-user-001", "https://other.invalid"), null);
});

test("Unicode origin search and device/page directory contexts keep their exact scopes", () => {
  const href = "/admin/users/online?" + new URLSearchParams({ q: "旅".repeat(120), platform: "ios", page: "2" });
  assert.ok(href.length > 1000 && href.length < 2048);
  assert.equal(safeAdminUsersReturnHref(href), href);
  assert.equal(safeActivityQueryParams({ usersReturn: href }).usersReturn, href);
  for (const section of ["devices", "pages"]) {
    const input = "/admin/users/" + section + "?range=custom&page=3&from=2026-11-01&to=2026-11-20&q=Guest&tab=guests&platform=android";
    assert.equal(adminUsersActivityReturn({ usersReturn: input }).href, input);
  }
});

test("main-directory return pages share the exact-integer pagination bound without changing other history caps", () => {
  for (const page of [1_000_001, ADMIN_USERS_DIRECTORY_MAX_PAGE]) {
    const href = "/admin/users?tab=GUEST&date=all&page=" + page;
    assert.equal(safeAdminUsersReturnHref(href), href);
    const activity = adminUsersActivityHref("guest", "qa-guest-0001", href);
    assert.ok(activity);
    assert.equal(adminUsersActivityReturn(Object.fromEntries(new URL(activity, origin).searchParams)).href, href);
  }
  assert.equal(safeAdminUsersReturnHref("/admin/users?page=" + (ADMIN_USERS_DIRECTORY_MAX_PAGE + 1)), null);
  assert.equal(safeAdminUsersReturnHref("/admin/users?page=9007199254740992"), null);
  assert.equal(safeAdminUsersReturnHref("/admin/users?page=1e3"), null);
  assert.equal(safeAdminUsersReturnHref("/admin/users/online?page=1000001"), null);
  for (const section of ["pages", "devices"]) {
    assert.equal(safeAdminUsersReturnHref("/admin/users/" + section + "?page=1000001"), null);
  }
});

test("original search return ignores arbitrary destinations and keeps independent search filters", () => {
  const raw = { range: "7d", environment: "staging", activityReturn: "https://other.invalid" };
  assert.deepEqual(searchDetailReturn(raw), { href: "/admin/searches/activity?range=7d&environment=staging", label: "Search activity" });
  const url = new URL(adminActivitySearchHref("qa-search-0001", "production", "https://other.invalid"), origin);
  assert.equal(url.searchParams.has("activityReturn"), false);
  assert.equal(url.pathname, "/admin/searches/qa-search-0001");
});
