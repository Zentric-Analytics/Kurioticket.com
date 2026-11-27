import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { HISTORY_DIRECTORY_PAGE_SIZE, historyDirectoryHref, historyDirectoryReturnHref, historyIdentityHref, parseHistoryDirectoryQuery, type HistoryDirectoryQuery, type HistorySection } from "./adminHistoryDirectory";
import { historyDirectorySql } from "./adminHistoryDirectorySql";
import { parsePageHistoryQuery } from "./adminPageHistory";
import { parseDeviceHistoryQuery, deviceHistoryWindow } from "./adminDeviceHistory";
import { activityWindow } from "./adminIdentityActivity";

const now = new Date("2026-11-24T16:40:00.000Z");
const origin = "https://staging.kurioticket.com";
function query(section: HistorySection, raw: Record<string, string | string[] | undefined> = {}): HistoryDirectoryQuery {
  const result = parseHistoryDirectoryQuery(section, raw);
  assert.ok(result.ok);
  return result.query;
}

test("history directories start at Today and reject invalid filters instead of broadening the record scope", () => {
  assert.deepEqual(query("devices"), { range: "today", page: 1, q: "", tab: "all", platform: "all" });
  assert.deepEqual(query("pages"), { range: "today", page: 1, q: "", tab: "all", platform: "all" });
  for (const raw of [
    { range: "invalid" }, { range: "custom" }, { range: "custom", from: "2026-02-30", to: "2026-03-01" },
    { range: "custom", from: "2026-11-25", to: "2026-11-24" }, { page: "0" }, { page: "1e3" }, { page: "1000001" },
    { tab: "unknown" }, { platform: "unknown" }, { q: "x".repeat(81) }, { q: "bad\nquery" },
    { tab: ["registered", "guests"] },
  ]) assert.equal(parseHistoryDirectoryQuery("pages", raw).ok, false, JSON.stringify(raw));
  for (const tab of ["all", "registered", "guests"] as const) for (const platform of ["all", "ios", "android", "desktop", "mobile"] as const) {
    const selected = query("devices", { tab, platform });
    assert.equal(selected.tab, tab);
    assert.equal(selected.platform, platform);
  }
  assert.equal(parseHistoryDirectoryQuery("devices", { platform: "unknown" }).ok, false);
});

test("history links keep the selected identity and inherit only compatible history filters", () => {
  const device = query("devices", { range: "custom", from: "2026-11-01", to: "2026-11-24", page: "3", q: "Example customer" });
  const deviceUrl = new URL(historyIdentityHref("devices", { kind: "user", id: "qa-account-0001" }, device, now), origin);
  assert.equal(deviceUrl.pathname, "/admin/users/user/qa-account-0001/devices");
  assert.equal(deviceUrl.searchParams.get("page"), "1");
  assert.equal(deviceUrl.searchParams.get("activityReturn"), historyDirectoryHref("devices", device));
  assert.equal(deviceUrl.searchParams.has("q"), false);
  const deviceDetail = parseDeviceHistoryQuery(Object.fromEntries(deviceUrl.searchParams));
  assert.ok(deviceDetail.ok);
  assert.deepEqual(deviceHistoryWindow(deviceDetail.query, now), deviceHistoryWindow(device, now));
  const guest = query("devices", { range: "all", tab: "guests", platform: "ios", page: "2", q: "qa-guest" });
  const guestUrl = new URL(historyIdentityHref("devices", { kind: "guest", id: "qa-guest-0001" }, guest, now), origin);
  assert.equal(guestUrl.pathname, "/admin/users/guest/qa-guest-0001/devices");
  assert.equal(guestUrl.searchParams.get("platform"), "ios");
  assert.equal(guestUrl.searchParams.get("page"), "1");
  assert.equal(guestUrl.searchParams.has("q"), false);
  assert.equal(historyDirectoryReturnHref("devices", guestUrl.searchParams.get("activityReturn")), historyDirectoryHref("devices", guest));

  for (const kind of ["user", "guest"] as const) {
    const pages = query("pages", { range: "7d", platform: "ios", tab: kind === "user" ? "registered" : "guests", page: "2", q: "qa-id" });
    const url = new URL(historyIdentityHref("pages", { kind, id: "qa-identity-0001" }, pages, now), origin);
    assert.equal(url.pathname, "/admin/users/" + kind + "/qa-identity-0001/pages");
    assert.equal(url.searchParams.get("platform"), "ios");
    assert.equal(url.searchParams.get("page"), "1");
    assert.equal(url.searchParams.has("q"), false, "identity search must not become route search");
    assert.equal(url.searchParams.get("activityReturn"), historyDirectoryHref("pages", pages));
    const detail = parsePageHistoryQuery(Object.fromEntries(url.searchParams), now);
    const original = parsePageHistoryQuery({ range: pages.range, platform: pages.platform }, now);
    assert.ok(detail.ok && original.ok);
    assert.deepEqual(activityWindow(detail.query.filters), activityWindow(original.query.filters));
    assert.equal(historyDirectoryReturnHref("pages", url.searchParams.get("activityReturn")), historyDirectoryHref("pages", pages));
  }
});

test("directory return paths are strictly internal and preserve valid search, paging and filter state", () => {
  const selected = query("pages", { range: "all", q: "Example & Co?", tab: "guests", platform: "android", page: "4" });
  const href = historyDirectoryHref("pages", selected);
  assert.equal(historyDirectoryReturnHref("pages", href), href);
  for (const unsafe of [
    "https://evil.example/admin/users/pages", "//evil.example/admin/users/pages", "/admin/users/devices",
    "/admin/users/user/qa-account-0001/activity", "/admin/users/pages/extra", "/admin/users/pages#bad",
    "/admin/users/pages?tab=guests&tab=registered", "/admin/users/pages?page=0",
    "/admin/users/pages?range=custom", "/admin/users/pages?q=%0A",
  ]) assert.equal(historyDirectoryReturnHref("pages", unsafe), null, unsafe);
  assert.equal(historyDirectoryReturnHref("devices", href), null);
});

test("device directory counts retained account sessions with the same date window before pagination", () => {
  const filters = query("devices", { range: "custom", from: "2026-11-01", to: "2026-11-24", q: "a%_'", page: "3", tab: "registered", platform: "desktop" });
  const sql = historyDirectorySql("devices", filters, "staging", now);
  const text = sql.strings.join("?");
  assert.match(text, /FROM "AccountSession" s JOIN "User" u ON u\."id" = s\."userId"/);
  assert.match(text, /COUNT\(\*\)::bigint AS "count", MAX\(s\."lastSeenAt"\)/);
  assert.match(text, /GROUP BY u\."id", u\."name", u\."email"/);
  assert.match(text, /s\."client" = 'WEB' AND NOT/);
  assert.doesNotMatch(text, /OnlinePresenceSession|AnalyticsEvent|tokenHash|maskedIp|userAgent/);
  assert.ok(!text.includes(filters.q), "search is a bound literal, not SQL");
  assert.equal(sql.values.filter(value => value === filters.q).length, 3);
  assert.deepEqual(sql.values.filter(value => value instanceof Date), Object.values(deviceHistoryWindow(filters, now)));
  assert.deepEqual(sql.values.slice(-2), [HISTORY_DIRECTORY_PAGE_SIZE, 40]);
  assert.match(text, /LEFT JOIN LATERAL/);
  assert.match(text, /ORDER BY "lastSeenAt" DESC, "kind" ASC, "id" ASC\s+LIMIT/);
});

test("page directory uses the existing consent, ownership, environment, route and platform scope", () => {
  const filters = query("pages", { range: "today", tab: "guests", platform: "ios", page: "2" });
  const sql = historyDirectorySql("pages", filters, "staging", now);
  const text = sql.strings.join("?");
  assert.match(text, /FROM "AnalyticsEvent" a JOIN "Visitor" v ON v\."id" = a\."visitorId"/);
  assert.match(text, /COALESCE\(v\."currentUserId", v\."id"\) AS "id"/);
  assert.match(text, /a\."type" = 'PAGE_VIEW' AND a\."name" = 'page_viewed'/);
  assert.match(text, /a\."metadata"->>'environment' = \?/);
  assert.match(text, /v\."consentStatus" = 'GRANTED' AND v\."trackingDisabledAt" IS NULL/);
  assert.match(text, /v\."currentUserId" IS NULL AND a\."userId" IS NULL/);
  assert.match(text, /NOT EXISTS \(SELECT 1 FROM "VisitorIdentityLink" l WHERE l\."visitorId" = v\."id"\)/);
  assert.match(text, /u\."status" = 'ACTIVE' AND u\."emailVerified" IS NOT NULL/);
  assert.match(text, /\(a\."userId" IS NULL OR a\."userId" = v\."currentUserId"\)/);
  assert.match(text, /EXISTS \(SELECT 1 FROM "VisitorIdentityLink" l WHERE l\."visitorId" = v\."id" AND l\."userId" = v\."currentUserId"\)/);
  assert.match(text, /NOT EXISTS \(SELECT 1 FROM "VisitorIdentityLink" l WHERE l\."visitorId" = v\."id" AND l\."userId" <> v\."currentUserId"\)/);
  assert.match(text, /a\."metadata"->>'transport' = 'web' AND a\."metadata"->>'pageKey' IN/);
  assert.match(text, /a\."metadata"->>'transport' = 'native' AND a\."metadata"->>'pageKey' IN/);
  assert.match(text, /AND "kind" = 'guest'/);
  assert.ok(sql.values.includes("staging"));
  assert.ok(sql.values.includes("iOS app") && sql.values.includes("iOS app (reported)"));
  assert.ok(sql.values.includes("support") && sql.values.includes("trips"));
  assert.ok(sql.values.includes("native"));
  assert.deepEqual(sql.values.slice(-2), [HISTORY_DIRECTORY_PAGE_SIZE, 20]);
  const registered = historyDirectorySql("pages", query("pages", { range: "all", tab: "registered" }), "production", now);
  assert.match(registered.strings.join("?"), /AND "kind" = 'user'/);
  assert.ok(registered.values.includes("production"));
});

test("both routes require admin authorization before rendering and reuse the existing individual history readers", () => {
  for (const section of ["devices", "pages"]) {
    const route = readFileSync("src/app/admin/users/" + section + "/page.tsx", "utf8");
    assert.ok(route.includes('await requireAdminSession("/admin/users/' + section + '")'));
    assert.ok(route.includes('<AdminHistoryDirectory timeZone={timeZone} section="' + section + '"'));
  }
  const devices = readFileSync("src/app/admin/users/[kind]/[id]/devices/page.tsx", "utf8");
  const pages = readFileSync("src/app/admin/users/[kind]/[id]/pages/page.tsx", "utf8");
  assert.match(devices, /historyDirectoryReturnHref\("devices", incoming\)/);
  assert.match(devices, /Back to Device & Access/);
  assert.match(devices, /loadAdminFullDeviceHistory\(id, query, timeZone, observedAt\)/);
  assert.match(pages, /historyDirectoryReturnHref\("pages", raw\.activityReturn\)/);
  assert.match(pages, /Back to Pages Visited/);
  assert.match(pages, /loadAdminIdentityActivity\(kind, id, query\.filters/);
  assert.match(devices, /Back to Activity/);
  assert.match(pages, /Back to Activity/);
});

test("guest access directory and detail use the identical consent and operational record scopes", () => {
  const selected = query("devices", { range: "all", tab: "guests", platform: "ios" });
  const sql = historyDirectorySql("devices", selected, "staging", now);
  const text = sql.strings.join("?");
  assert.doesNotMatch(text, /FROM "AccountSession"|OnlinePresenceSession|tokenHash|userAgent|maskedIp/);
  assert.match(text, /a\."userId" IS NULL AND v\."currentUserId" IS NULL/);
  assert.match(text, /v\."consentStatus" = 'GRANTED' AND v\."trackingDisabledAt" IS NULL/);
  assert.match(text, /NOT EXISTS \(SELECT 1 FROM "VisitorIdentityLink"/);
  assert.match(text, /FROM "SearchHistory" x/);
  assert.match(text, /FROM "RedirectLog" x/);
  assert.match(text, /x\."userId" IS NULL AND x\."visitorId" IS NULL/);
  assert.match(text, /NOT EXISTS \(SELECT 1 FROM "Visitor" existing/);
  assert.match(text, /'operational'::text AS "guestSource"/);
  assert.match(text, /'consented'::text AS "guestSource"/);
  assert.ok(sql.values.includes("ios"));
  assert.ok(sql.values.includes("iOS app (reported)"));
  const browser = historyDirectorySql("devices", query("devices", { tab: "guests", platform: "desktop" }), "staging", now);
  assert.match(browser.strings.join("?"), /FROM "SearchHistory" x/);
  assert.match(browser.strings.join("?"), /FROM "RedirectLog" x/);
  assert.match(browser.strings.join("?"), /'guestAccess'->>'version' = '1'/);
  assert.match(browser.strings.join("?"), /'guestAccess'->>'platform' IN \('desktop', 'mobile'\)/);
  assert.ok(browser.values.includes("desktop"));
  const all = historyDirectorySql("devices", query("devices"), "production", now);
  assert.match(all.strings.join("?"), /FROM "AccountSession"/);
  assert.match(all.strings.join("?"), /FROM "AnalyticsEvent"/);
  assert.ok(all.values.includes("production"));
});
