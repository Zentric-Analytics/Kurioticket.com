import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminOnlineUsersSnapshot, resolveLiveGuestActivity, type RawPresenceRow } from "./adminOnlineUsersSnapshot";

const now = new Date("2026-11-21T20:00:00.000Z");
function observation(
  sourceId: string, platform: string, atSecondsAgo: number,
  account: { id: string; role: string; name: string; email?: string } | null = null,
  linkedSession = Boolean(account), locationLabel: string | null = null,
): RawPresenceRow {
  return {
    sourceId, platform, accountSessionId: linkedSession ? "session-" + sourceId : null,
    userId: account?.id ?? null, name: account?.name ?? null, email: account?.email ?? null,
    role: account?.role ?? null, locationLabel,
    lastSeenAt: new Date(now.getTime() - atSecondsAgo * 1000),
  };
}

test("registered accounts count once across web, iOS, Android and admin devices", () => {
  const alice = { id: "u-alice", name: "Alice Example", role: "ADMIN", email: "alice@example.invalid" };
  const bob = { id: "u-bob", name: "Bob Example", role: "USER" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("alice-desktop", "desktop_web", 4, alice),
    observation("alice-ios", "ios", 5, alice),
    observation("alice-mobile", "mobile_web", 6, alice),
    observation("bob-android", "android", 12, bob),
    observation("guest-one", "desktop_web", 3),
    observation("guest-two", "mobile_web", 14),
  ], now);
  assert.equal(snapshot.total, 4);
  assert.equal(snapshot.registeredAccounts, 2);
  assert.equal(snapshot.guestSessions, 2);
  assert.deepEqual(snapshot.platforms, {
    desktop_web: 2, mobile_web: 2, ios: 1, android: 1, website: 3, unclassified: 0,
  });
  const account = snapshot.rows.find(r => r.id === "u-alice");
  assert.deepEqual(account?.platforms, ["desktop_web","ios","mobile_web"]);
  assert.equal(snapshot.rows.filter(row => row.id === "u-alice").length, 1);
});

test("expired heartbeat and unverifiable account sessions are never shown as online", () => {
  const user = { id: "u-real", name: "Real person", role: "USER" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("valid", "desktop_web", 89, user),
    observation("outdated", "ios", 91, user),
    observation("invalid-account", "ios", 1, null, true),
    observation("future", "android", -3),
    observation("exact-edge", "mobile_web", 90),
    observation("valid-guest", "android", 2),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.registeredAccounts, 1);
  assert.equal(snapshot.guestSessions, 1);
  assert.equal(snapshot.platforms.ios, 0);
  assert.equal(snapshot.platforms.android, 1);
  assert.ok(snapshot.rows.every(row => row.name !== "invalid-account"));
});

test("anonymous source credentials cannot be exposed or mistaken for recorded visitors", () => {
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("private-hashed-session-1", "ios", 10),
    observation("private-hashed-session-1", "ios", 8),
    observation("private-hashed-session-2", "desktop_web", 9),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.guestSessions, 2);
  assert.ok(snapshot.rows.every(row => row.kind === "guest" && row.name === "Guest session"
    && row.email === null && row.role === null && !row.id.includes("private-hashed-session")));
  assert.equal(JSON.stringify(snapshot).includes("private-hashed-session"), false);
});

test("per-platform totals preserve website union without double counting the same account", () => {
  const account = { id: "u-same", role: "SUPPORT", name: "Support Example" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("a", "desktop_web", 1, account),
    observation("b", "mobile_web", 2, account),
    observation("c", "desktop_web", 5, account),
    observation("unknown", "unidentified_platform", 4),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.platforms.desktop_web, 1);
  assert.equal(snapshot.platforms.mobile_web, 1);
  assert.equal(snapshot.platforms.website, 1);
  assert.equal(snapshot.platforms.unclassified, 1);
  assert.equal(snapshot.rows[0].role, "SUPPORT");
});

test("the latest verified account heartbeat owns the displayed approximate location", () => {
  const account = { id: "u-location", role: "ADMIN", name: "Verified Example" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("older", "desktop_web", 65, account, true, "New York, United States"),
    observation("latest", "ios", 2, account, true, "Lagos, Nigeria"),
    observation("middle", "mobile_web", 35, account, true, "Accra, Ghana"),
  ], now);
  assert.equal(snapshot.total, 1);
  assert.equal(snapshot.rows[0].locationLabel, "Lagos, Nigeria");
  assert.deepEqual(snapshot.rows[0].platforms, ["desktop_web", "ios", "mobile_web"]);
});

test("missing recent location and anonymous presence never inherit an unrelated place", () => {
  const account = { id: "u-location", role: "USER", name: "Verified Example" };
  const snapshot = buildAdminOnlineUsersSnapshot([
    observation("older-known", "desktop_web", 30, account, true, "Lagos, Nigeria"),
    observation("latest-unknown", "ios", 1, account, true, null),
    observation("anonymous", "android", 4, null, false, "Do not expose guest location"),
    observation("invalid", "ios", 3, null, true, "Unverified location"),
  ], now);
  assert.equal(snapshot.total, 2);
  assert.equal(snapshot.rows.find(row => row.kind === "registered")?.locationLabel, null);
  assert.equal(snapshot.rows.find(row => row.kind === "guest")?.locationLabel, null);
  assert.equal(JSON.stringify(snapshot).includes("Do not expose guest location"), false);
  assert.equal(JSON.stringify(snapshot).includes("Unverified location"), false);
});

test("recorded location strings are trimmed and invalid characters or oversized labels are rejected", () => {
  const account = { id: "u-location", role: "ADMIN", name: "Verified Example" };
  const good = buildAdminOnlineUsersSnapshot([
    observation("valid", "desktop_web", 1, account, true, "  Lagos, Nigeria  "),
  ], now);
  assert.equal(good.rows[0].locationLabel, "Lagos, Nigeria");
  for (const label of ["   ", "X".repeat(161), "Lagos" + String.fromCharCode(10) + "Nigeria"]) {
    const invalid = buildAdminOnlineUsersSnapshot([
      observation("invalid", "desktop_web", 1, account, true, label),
    ], now);
    assert.equal(invalid.rows[0].locationLabel, null);
  }
});

test("live guest preview uses only a validated current observation and an opaque reference",()=>{
  const first = new Date(+now-30000).toISOString();
  const access = {reference:"A".repeat(43),firstSeenAt:first,countryCode:"NG",deviceLabel:"iOS device",browser:null,os:"iOS"};
  const snapshot = buildAdminOnlineUsersSnapshot([
    {...observation("private-source","ios",5),liveReference:access.reference,liveAccess:access,liveCountryCode:"NG"},
    observation("other-private-source","android",2,null,false,"Unrelated country"),
  ],now);
  assert.equal(snapshot.total,2);
  const row = snapshot.rows.find(r=>r.liveAccess);
  assert.equal(row?.locationLabel,"Nigeria");
  assert.equal(row?.liveAccess?.firstSeenAt,first);
  assert.equal(snapshot.rows.find(r=>!r.liveAccess)?.locationLabel,null);
  assert.doesNotMatch(JSON.stringify(snapshot),/private-source/);
  const stale = buildAdminOnlineUsersSnapshot([
    {...observation("private-source","ios",20),liveReference:access.reference,liveAccess:access,liveCountryCode:"NG"},
    observation("private-source","ios",1),
  ],now);
  assert.equal(stale.rows[0].liveAccess,undefined);
  assert.equal(stale.rows[0].locationLabel,null);
});

test("verified live guest can be opened without recording optional access details",()=>{
  const reference = "B".repeat(43);
  const snapshot = buildAdminOnlineUsersSnapshot([
    {...observation("source-one","ios",5),liveReference:reference},
    {...observation("expired","android",90),liveReference:"C".repeat(43)},
    {...observation("invalid-account","ios",1,null,true),liveReference:"D".repeat(43)},
    {...observation("invalid-reference","mobile_web",2),liveReference:"raw-source"},
    {...observation("account","desktop_web",3,{id:"u-valid",name:"Account",role:"USER"}),liveReference:"E".repeat(43)},
  ],now);
  assert.equal(snapshot.total,3);
  const guest=snapshot.rows.find(r=>r.liveReference===reference);
  assert.equal(guest?.kind,"guest");
  assert.equal(guest?.liveAccess,undefined);
  assert.equal(guest?.locationLabel,null);
  assert.equal(snapshot.rows.filter(r=>r.liveReference).length,1);
  assert.doesNotMatch(JSON.stringify(snapshot),/source-one|raw-source|expired|invalid-account/);
});

test("preview detail cannot be attached to a different live reference",()=>{
  const snapshot=buildAdminOnlineUsersSnapshot([{
    ...observation("source-one","ios",5),liveReference:"A".repeat(43),
    liveAccess:{reference:"B".repeat(43),firstSeenAt:new Date(+now-30000).toISOString(),countryCode:"NG",deviceLabel:"iOS device",browser:null,os:"iOS"},
  }],now);
  assert.equal(snapshot.rows[0].liveReference,"A".repeat(43));
  assert.equal(snapshot.rows[0].liveAccess,undefined);
  assert.equal(snapshot.rows[0].locationLabel,null);
});

test("live activity resolution accepts exactly one fresh guest reference",()=>{
  const reference = "A".repeat(43);
  const snapshot = buildAdminOnlineUsersSnapshot([
    {...observation("one","desktop_web",5),liveReference:reference},
    {...observation("two","android",2),liveReference:"B".repeat(43)},
  ],now);
  assert.equal(resolveLiveGuestActivity(snapshot,reference,now)?.platforms[0],"desktop_web");
  assert.equal(resolveLiveGuestActivity(snapshot,"B".repeat(43),now)?.platforms[0],"android");
  assert.equal(resolveLiveGuestActivity(snapshot,"C".repeat(43),now),null);
  assert.equal(resolveLiveGuestActivity(snapshot,"guest-1",now),null);
});

test("guest activity cannot resolve a stale heartbeat or a stale or future snapshot",()=>{
  const reference = "A".repeat(43);
  const snapshot = buildAdminOnlineUsersSnapshot([
    {...observation("one","ios",89),liveReference:reference},
  ],now);
  assert.ok(resolveLiveGuestActivity(snapshot,reference,now));
  assert.equal(resolveLiveGuestActivity(snapshot,reference,new Date(+now+1000)),null);
  assert.equal(resolveLiveGuestActivity(snapshot,reference,new Date(+now+90000)),null);
  assert.equal(resolveLiveGuestActivity(snapshot,reference,new Date(+now-1)),null);
  assert.equal(resolveLiveGuestActivity({status:"unavailable",observedAt:now.toISOString(),windowSeconds:90},reference,now),null);
});

test("guest activity rejects ambiguous and authenticated roster matches",()=>{
  const reference = "A".repeat(43);
  const duplicate = buildAdminOnlineUsersSnapshot([
    {...observation("one","ios",5),liveReference:reference},
    {...observation("two","android",2),liveReference:reference},
  ],now);
  assert.equal(resolveLiveGuestActivity(duplicate,reference,now),null);
  const account = buildAdminOnlineUsersSnapshot([
    observation("one","ios",1,{id:"u-valid",name:"Account",role:"USER"}),
  ],now);
  assert.equal(resolveLiveGuestActivity(account,reference,now),null);
  assert.equal(resolveLiveGuestActivity({...account,rows:account.rows.map(row=>({...row,liveReference:reference}))},reference,now),null);
});

test("verified country is independent of optional first access and disappears on a newer unknown heartbeat",()=>{
  const reference="F".repeat(43);
  const source={...observation("live-source","desktop_web",5),liveReference:reference,liveCountryCode:"NG"};
  const current=buildAdminOnlineUsersSnapshot([source],now);
  assert.equal(current.rows[0].locationLabel,"Nigeria");
  assert.equal(current.rows[0].liveAccess,undefined);
  assert.equal(resolveLiveGuestActivity(current,reference,now)?.locationLabel,"Nigeria");
  assert.doesNotMatch(JSON.stringify(current),/live-source|liveCountryCode|firstSeenAt/);
  assert.equal(buildAdminOnlineUsersSnapshot([source,{...source,lastSeenAt:new Date(+now-1000),liveCountryCode:null}],now).rows[0].locationLabel,null);
  assert.equal(buildAdminOnlineUsersSnapshot([{...source,liveCountryCode:"XX"}],now).rows[0].locationLabel,null);
  assert.equal(buildAdminOnlineUsersSnapshot([{...source,liveReference:undefined}],now).rows[0].locationLabel,null);
  assert.equal(buildAdminOnlineUsersSnapshot([{...source,lastSeenAt:new Date(+now-90000)}],now).total,0);
  const oldPreview={...source,liveCountryCode:undefined,liveAccess:{reference,firstSeenAt:new Date(+now-20000).toISOString(),countryCode:"NG",deviceLabel:null,browser:null,os:null}};
  assert.equal(buildAdminOnlineUsersSnapshot([oldPreview],now).rows[0].locationLabel,null,"legacy preview cannot supply a country");
});

test("each platform and live activity resolve the same independently verified current country", () => {
  const cases = [
    ["desktop_web", "NG", "Nigeria"], ["mobile_web", "GB", "United Kingdom"],
    ["ios", "CA", "Canada"], ["android", "JP", "Japan"],
  ] as const;
  const rows = cases.map(([platform, code], i) => ({
    ...observation("source-" + i, platform, 5),
    liveReference: String(i + 1).repeat(43), liveCountryCode: code,
  }));
  const snapshot = buildAdminOnlineUsersSnapshot(rows, now);
  assert.equal(snapshot.guestSessions, 4);
  for (const [platform, , name] of cases) {
    const row = snapshot.rows.find(r => r.platforms.includes(platform))!;
    assert.equal(row.locationLabel, name);
    assert.equal(resolveLiveGuestActivity(snapshot, row.liveReference, now)?.locationLabel, name);
  }
  const changed = buildAdminOnlineUsersSnapshot([...rows, {
    ...rows[0], lastSeenAt: new Date(+now - 1000), liveCountryCode: "CA",
  }], now);
  assert.equal(resolveLiveGuestActivity(changed, rows[0].liveReference, now)?.locationLabel, "Canada");
  const unknown = buildAdminOnlineUsersSnapshot([...rows, {
    ...rows[0], lastSeenAt: new Date(+now - 1000), liveCountryCode: null,
  }], now);
  assert.equal(resolveLiveGuestActivity(unknown, rows[0].liveReference, now)?.locationLabel, null);
});
