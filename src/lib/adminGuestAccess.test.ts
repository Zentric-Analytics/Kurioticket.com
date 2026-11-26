import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { accountDevicePlatform, accountDevicePlatformWhere, pageViewDevicePlatform } from "./adminDevicePlatform";
import { consentedGuestAccessObservation, recordedGuestAccessLocation, recordedGuestLocationSummary, safeGuestDeviceDescription } from "./guestAccessObservation";
import { guestAccessHistorySql, guestLatestRecordedLocationsSql } from "./adminGuestAccessSql";

test("platform filters match known recorded categories and leave absent evidence unclassified", () => {
  for (const [client, platform, deviceLabel, expected] of [
    ["MOBILE", "ios", null, "ios"], ["MOBILE", "android", null, "android"],
    ["MOBILE", null, null, "native"], ["WEB", null, "iPhone", "mobile"],
    ["WEB", null, "Android phone", "mobile"], ["WEB", null, "Windows computer", "desktop"],
    ["WEB", null, "Mac", "desktop"], ["WEB", null, null, "web"],
  ] as const) assert.equal(accountDevicePlatform({ client, platform, deviceLabel }), expected);
  assert.deepEqual(accountDevicePlatformWhere("ios"), { client: "MOBILE", platform: "ios" });
  assert.deepEqual(accountDevicePlatformWhere("all"), {});
  assert.equal(pageViewDevicePlatform("iOS app (reported)", "native"), "ios");
  assert.equal(pageViewDevicePlatform("iOS app (reported)", "web"), "web");
});

test("new guest descriptions are coarse observations with no raw agent, IP, hardware ID or credential", () => {
  const request = new Request("https://staging.kurioticket.com/api/activity/page-views", {
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0", "cf-ipcountry": "NG", "cf-ipcity": "Lagos", "cf-connecting-ip": "203.0.113.1" },
  });
  const observed = consentedGuestAccessObservation(request, "Desktop web (reported)", "web", true);
  assert.deepEqual(observed, { version: 1, deviceLabel: "Windows computer", browser: "Chrome 140", os: "Windows", locationLabel: "Lagos, Nigeria" });
  assert.equal(consentedGuestAccessObservation(request, "Desktop web (reported)", "web", false)?.locationLabel, null);
  assert.equal(consentedGuestAccessObservation(new Request(request.url), "Desktop web (reported)", "web"), undefined);
  assert.equal(consentedGuestAccessObservation(request, "Website", "web"), undefined);
  assert.doesNotMatch(JSON.stringify(observed), /203\.0\.113\.1|Mozilla|user-agent/);
  assert.equal(safeGuestDeviceDescription("Chrome 140", "browser"), "Chrome 140");
  assert.equal(safeGuestDeviceDescription("secret-agent-value", "browser"), null);
  assert.equal(safeGuestDeviceDescription("Lagos, Nigeria", "locationLabel"), "Lagos, Nigeria");
  assert.equal(safeGuestDeviceDescription("123 Main Street", "locationLabel"), null);
});

test("guest observations remain behind the existing consent lock and are not newly collected in production", () => {
  const source = readFileSync("src/app/api/activity/page-views/route.ts", "utf8");
  assert.ok(source.indexOf("await lockConsentedVisitor") < source.indexOf("const guestAccess ="));
  assert.match(source, /!identity\.userId && getPublicEnvironment\(\) === "staging"/);
  assert.match(source, /\.\.\.\(guestAccess \? \{ guestAccess \} : \{\}\)/);
  assert.match(source, /if \(!identity\.visitorId\) return/);
  const sql = guestAccessHistorySql("qa-guest-0001", { range: "today", page: 2, platform: "ios" }, "staging", new Date("2026-11-24T16:40:00Z"));
  assert.ok(sql.values.includes("qa-guest-0001"));
  assert.deepEqual(sql.values.slice(-2), [20, 20]);
  assert.match(sql.strings.join("?"), /MIN\("at"\) AS "firstSeenAt", MAX\("at"\)/);
  assert.doesNotMatch(sql.strings.join("?"), /tokenHash|maskedIp|userAgent|OnlinePresenceSession/);
});

test("operational access projects only its own saved country, never another observation", () => {
  const search = { guestSource: "operational", evidence: "search" };
  assert.equal(recordedGuestAccessLocation({...search,recordedCountryCode:"NG"}), "Nigeria");
  assert.equal(recordedGuestAccessLocation({...search,recordedCountryCode:"gb"}), "United Kingdom");
  for(const country of [null,undefined,{},["NG"],"XX","T1","NGA","192.0.2.1","Nigeria"]) {
    assert.equal(recordedGuestAccessLocation({...search,recordedCountryCode:country,locationLabel:"Nigeria"}),null);
  }
  assert.equal(recordedGuestAccessLocation({guestSource:"operational",evidence:"handoff",recordedCountryCode:"NG",locationLabel:"Nigeria"}),null);
  assert.equal(recordedGuestAccessLocation({guestSource:"consented",evidence:"page",recordedCountryCode:"NG",locationLabel:"Lagos, Nigeria"}),"Lagos, Nigeria");
  assert.equal(recordedGuestAccessLocation({guestSource:"consented",evidence:"page",recordedCountryCode:"NG"}),null);
  const sql = guestAccessHistorySql("12345678-1234-4123-8123-123456789abc",{range:"all",page:1,platform:"all"},"staging",new Date("2026-11-26T18:00:00Z"));
  const statement=sql.strings.join("?");
  assert.match(statement,/jsonb_typeof\(x\."query" #> '\{searchNetwork,countryCode\}'\) = 'string'/);
  assert.match(statement,/THEN x\."query" #>> '\{searchNetwork,countryCode\}' END AS "recordedCountryCode"/);
  assert.doesNotMatch(statement,/ipAddress|cf-connecting-ip|OnlinePresenceSession/);
  assert.ok(sql.values.includes("staging"));
});

test("dated guest locations reject invalid evidence, unknown countries and future observations", () => {
  const at = new Date("2026-11-26T12:00:00Z"), now = new Date(+at + 1000);
  assert.deepEqual(recordedGuestLocationSummary({ guestSource: "operational", evidence: "search", recordedCountryCode: "CA", at }, now), { label: "Canada", at });
  assert.deepEqual(recordedGuestLocationSummary({ guestSource: "consented", evidence: "page", locationLabel: "London, United Kingdom", at }, now), { label: "London, United Kingdom", at });
  for (const value of ["Unknown", "ZZ", "Invented place", "Lagos, XX"]) {
    assert.equal(recordedGuestLocationSummary({ guestSource: "consented", evidence: "page", locationLabel: value, at }, now), null);
  }
  assert.equal(recordedGuestLocationSummary({ guestSource: "operational", evidence: "handoff", recordedCountryCode: "CA", at }, now), null);
  assert.equal(recordedGuestLocationSummary({ guestSource: "operational", evidence: "search", recordedCountryCode: "CA", at: new Date(+now + 1) }, now), null);
  const id = "12345678-1234-4123-8123-123456789abc";
  const sql = guestLatestRecordedLocationsSql([id], { range: "all", page: 2, platform: "all" }, "staging", now);
  assert.match(sql.strings.join("?"), /SELECT DISTINCT ON \("guestId", "guestSource"\)/);
  assert.match(sql.strings.join("?"), /ORDER BY "guestId", "guestSource", "at" DESC, "recordId" ASC/);
  assert.doesNotMatch(sql.strings.join("?"), /OnlinePresenceSession|ipAddress|OFFSET/);
  assert.ok(sql.values.includes(id) && sql.values.includes("staging") && sql.values.includes("CA"));
  assert.match(guestLatestRecordedLocationsSql([], {range:"all",page:1}, "staging", now).strings.join("?"), /AND FALSE/);
});
