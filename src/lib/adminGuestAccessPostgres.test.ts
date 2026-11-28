import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma";
import { visitorFreeAccountAnalyticsWhere } from "./adminAnalyticsVisibility";
import { guestAccessHistorySql, guestLatestRecordedLocationsSql } from "./adminGuestAccessSql";
import { recordedGuestAccessLocation, recordedGuestLocationSummary } from "./guestAccessObservation";
import { operationalGuestDeviceObservation } from "./operationalGuestDeviceObservation";
import { adminIdentityPageSql, adminRegisteredIdentityCountSql, type AdminIdentityDirectoryRow, type AdminIdentityPageRequest, type AdminIdentitySort } from "./adminIdentityDirectory";

/** Disposable CI database only. Proves the actual SQL retains exact record
 * ownership and environment without importing a different search's country. */
test("saved search country reaches access history for the same operational guest only", {skip:!process.env.GUEST_COUNTRY_TEST_DATABASE_URL},async()=>{
  const previous=process.env.DATABASE_URL;
  process.env.DATABASE_URL=process.env.GUEST_COUNTRY_TEST_DATABASE_URL!;
  const db=getPrisma();
  const owner=randomUUID(), other=randomUUID();
  const at=new Date("2026-11-26T12:00:00Z");
  const now=new Date(+at+60_000);
  const ids=Array.from({length:6},()=>randomUUID());
  const redirectId=randomUUID();
  type Row={recordId:string|null;guestId:string;guestSource:string;evidence:string;locationLabel:string|null;recordedCountryCode:string|null;deviceLabel:string|null;browser:string|null;os:string|null;total:bigint};
  try {
    const rows=[
      {id:ids[0],session:owner,environment:"staging",source:"WEB",country:"NG"},
      {id:ids[1],session:owner,environment:"staging",source:"WEB",country:"XX"},
      {id:ids[2],session:owner,environment:"production",source:"WEB",country:"GB"},
      {id:ids[3],session:other,environment:"staging",source:"WEB",country:"GB"},
      {id:ids[4],session:owner,environment:"staging",source:"BOT",country:"GB"},
      {id:ids[5],session:owner,environment:"staging",source:"WEB",country:["NG"]},
    ];
    await db.searchHistory.createMany({data:rows.map(r=>({
      id:r.id,type:"CAR" as const,createdAt:at,
      query:{environment:r.environment,operationalSessionId:r.session,applicationSource:r.source,searchNetwork:{countryCode:r.country,ipAddress:"203.0.113.1"}},
    }))});
    await db.redirectLog.create({data:{id:redirectId,type:"CAR",provider:"QA",destinationUrl:"https://example.invalid",userType:"GUEST",sourcePage:"QA",createdAt:at,
      metadata:{environment:"staging",operationalSessionId:owner,applicationSource:"WEB",searchNetwork:{countryCode:"GB"}}}});
    const result=await db.$queryRaw<Row[]>(guestAccessHistorySql(owner,{range:"all",page:1,platform:"all"},"staging",now));
    assert.equal(result.length,4);
    assert.ok(result.every(r=>r.guestId===owner&&Number(r.total)===4));
    const byId=new Map(result.map(r=>[r.recordId,r]));
    assert.equal(recordedGuestAccessLocation(byId.get("search:"+ids[0])!),"Nigeria");
    assert.equal(recordedGuestAccessLocation(byId.get("search:"+ids[1])!),null);
    assert.equal(recordedGuestAccessLocation(byId.get("search:"+ids[5])!),null);
    assert.equal(recordedGuestAccessLocation(byId.get("handoff:"+redirectId)!),null);
    assert.ok(result.every(r=>r.deviceLabel===null&&r.browser===null&&r.os===null));
    assert.ok(!byId.has("search:"+ids[2])&&!byId.has("search:"+ids[3])&&!byId.has("search:"+ids[4]));
    const locations = await db.$queryRaw<Array<Row & {at: Date}>>(guestLatestRecordedLocationsSql(
      [owner, other], {range:"all",page:2,platform:"all"}, "staging", now));
    assert.equal(locations.length, 2);
    assert.deepEqual(recordedGuestLocationSummary(locations.find(r=>r.guestId===owner)!, now), {label:"Nigeria",at});
    assert.deepEqual(recordedGuestLocationSummary(locations.find(r=>r.guestId===other)!, now), {label:"United Kingdom",at});
    const none = await db.$queryRaw(guestLatestRecordedLocationsSql([], {range:"all",page:1}, "staging", now));
    assert.deepEqual(none, []);
    assert.doesNotMatch(JSON.stringify(result,(_,v)=>typeof v==="bigint"?String(v):v),/203\.0\.113\.1|ipAddress/);
  } finally {
    await db.redirectLog.deleteMany({where:{id:redirectId}});
    await db.searchHistory.deleteMany({where:{id:{in:ids}}});
    await db.$disconnect();
    if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;
  }
});

test("operational device history and platform filters preserve exact observation ownership", { skip: !process.env.GUEST_COUNTRY_TEST_DATABASE_URL }, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.GUEST_COUNTRY_TEST_DATABASE_URL!;
  const db = getPrisma();
  const owner = randomUUID(), other = randomUUID(), handoffId = randomUUID();
  const ids = Array.from({ length: 10 }, () => randomUUID());
  const at = new Date("2026-11-26T12:00:00Z"), now = new Date(+at + 60_000);
  const device = (agent: string) => operationalGuestDeviceObservation(new Request("https://staging.kurioticket.com/api/cars/search", {
    headers: { "user-agent": agent },
  }), { applicationSource: "WEB" }, owner, "staging")!;
  const desktop = device("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0");
  const mobile = device("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1");
  type Row = { recordId: string | null; guestId: string; platform: string; deviceLabel: string | null; browser: string | null; os: string | null; total: bigint };
  try {
    const samples = [
      { source: "WEB", guestAccess: desktop }, { source: "WEB", guestAccess: mobile },
      { source: "IOS" }, { source: "ANDROID" }, { source: "WEB" },
      { source: "WEB", guestAccess: { ...desktop, version: 2 } },
      { source: "WEB", guestAccess: { ...desktop, platform: "ios" } },
      { source: "WEB", guestAccess: desktop, owner: other },
      { source: "WEB", guestAccess: desktop, environment: "production" },
      { source: "BOT", guestAccess: desktop },
    ];
    await db.searchHistory.createMany({ data: samples.map((sample, index) => ({ id: ids[index], type: "CAR" as const, createdAt: at,
      query: { environment: sample.environment ?? "staging", operationalSessionId: sample.owner ?? owner,
        applicationSource: sample.source, ...(sample.guestAccess ? { guestAccess: sample.guestAccess } : {}),
        searchNetwork: { countryCode: "NG" } },
    })) });
    await db.redirectLog.create({ data: { id: handoffId, type: "CAR", provider: "QA", destinationUrl: "https://example.invalid",
      userType: "GUEST", sourcePage: "QA", createdAt: at,
      metadata: { environment: "staging", operationalSessionId: owner, applicationSource: "WEB", guestAccess: mobile } } });
    const rows = await db.$queryRaw<Row[]>(guestAccessHistorySql(owner, { range: "all", page: 1 }, "staging", now));
    assert.equal(rows.length, 8);
    assert.ok(rows.every(row => row.guestId === owner && Number(row.total) === 8));
    const byId = new Map(rows.map(row => [row.recordId, row]));
    assert.deepEqual([byId.get("search:" + ids[0])?.deviceLabel, byId.get("search:" + ids[0])?.browser], ["Windows computer", "Chrome 140"]);
    assert.deepEqual([byId.get("search:" + ids[1])?.deviceLabel, byId.get("search:" + ids[1])?.browser], ["iPhone", "Safari 18"]);
    for (const [index, os] of [[2, "iOS"], [3, "Android"]] as const) {
      assert.equal(byId.get("search:" + ids[index])?.os, os);
      assert.equal(byId.get("search:" + ids[index])?.deviceLabel, os + " device");
      assert.equal(byId.get("search:" + ids[index])?.browser, null, "native app is not a browser");
    }
    for (const index of [4, 5, 6]) {
      const row = byId.get("search:" + ids[index])!;
      assert.deepEqual([row.platform, row.deviceLabel, row.browser, row.os], ["web", null, null, null]);
    }
    assert.equal(byId.get("handoff:" + handoffId)?.browser, "Safari 18");
    for (const [platform, expected] of [
      ["desktop", ["search:" + ids[0]]], ["mobile", ["search:" + ids[1], "handoff:" + handoffId]],
      ["ios", ["search:" + ids[2]]], ["android", ["search:" + ids[3]]],
    ] as const) {
      const selected = await db.$queryRaw<Row[]>(guestAccessHistorySql(owner, { range: "all", page: 1, platform }, "staging", now));
      assert.deepEqual(selected.map(row => row.recordId).sort(), [...expected].sort());
      assert.ok(selected.every(row => Number(row.total) === expected.length));
    }
  } finally {
    await db.redirectLog.deleteMany({ where: { id: handoffId } });
    await db.searchHistory.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

test("directory PostgreSQL pages retain mixed identity ordering and independent totals on empty pages", { skip: !process.env.GUEST_COUNTRY_TEST_DATABASE_URL }, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.GUEST_COUNTRY_TEST_DATABASE_URL!;
  const db = getPrisma();
  const prefix = randomUUID().slice(0, 8);
  const identityId = (index: number) => `${prefix}-${index.toString(16).padStart(4, "0")}-4abc-8def-${index.toString(16).padStart(12, "0")}`;
  const users = Array.from({ length: 7 }, (_, index) => identityId(index));
  const visitors = Array.from({ length: 12 }, (_, index) => identityId(20 + index));
  const operational = Array.from({ length: 9 }, (_, index) => identityId(50 + index));
  const excludedOperational = Array.from({ length: 3 }, (_, index) => identityId(70 + index));
  const searchIds: string[] = [], redirectIds: string[] = [];
  const now = new Date("2040-06-15T12:00:00.000Z");
  const joinedAt = new Date("2040-06-15T10:00:00.000Z");
  const lastSeenAt = new Date("2040-06-15T11:00:00.000Z");
  const oldJoinedAt = new Date("2040-06-14T10:00:00.000Z");
  const names = ["Alpha account", "Zulu account", "Guest visitor", "Beta account", "Alpha account", "Zebra account", "No observation"];
  type ExpectedIdentity = { id: string; kind: "user" | "guest"; joinedAt: Date; lastSeenAt: Date | null; displayName: string };
  const expected: ExpectedIdentity[] = [
    ...users.map((id, index) => ({ id, kind: "user" as const, joinedAt, lastSeenAt: index === 6 ? null : lastSeenAt, displayName: names[index] })),
    ...visitors.slice(0, 8).map(id => ({ id, kind: "guest" as const, joinedAt, lastSeenAt, displayName: "Guest visitor" })),
    ...operational.map((id, index) => ({ id, kind: "guest" as const, joinedAt: index < 2 ? oldJoinedAt : joinedAt, lastSeenAt, displayName: "Guest visitor" })),
  ];
  const request: AdminIdentityPageRequest = {
    query: prefix, role: "ALL", status: "ALL", showUsers: true, showGuests: true, showOperationalGuests: true,
    withOperationalSummary: true, environment: "staging", date: "today", now, timeZone: "UTC", limit: 20, offset: 0,
  };
  // Use ordinary string ordering for these ASCII fixture values, independently
  // of PostgreSQL's UNION and page implementation.
  const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
  const compare = (sort: AdminIdentitySort) => (a: ExpectedIdentity, b: ExpectedIdentity): number => {
    if (sort === "oldest") return +a.joinedAt - +b.joinedAt || compareText(a.kind, b.kind) || compareText(a.id, b.id);
    const primary = sort === "newest"
      ? a.lastSeenAt === null ? b.lastSeenAt === null ? 0 : 1 : b.lastSeenAt === null ? -1 : +b.lastSeenAt - +a.lastSeenAt
      : compareText(a.displayName.toLowerCase(), b.displayName.toLowerCase()) * (sort === "name_desc" ? -1 : 1);
    return primary || +b.joinedAt - +a.joinedAt || compareText(a.kind, b.kind) || compareText(b.id, a.id);
  };
  try {
    // Other files use the same disposable CI database. One repeatable-read
    // snapshot plus baseline deltas keeps their fixtures out of these totals.
    await db.$transaction(async tx => {
      const read = (overrides: Partial<AdminIdentityPageRequest> = {}) => {
        const sql = adminIdentityPageSql({ ...request, ...overrides });
        assert.ok(sql);
        return tx.$queryRaw<AdminIdentityDirectoryRow[]>(sql);
      };
      const [baseline] = await read();
      assert.equal(baseline.id, null);
      assert.equal(baseline.operationalGuestCount, BigInt(0));
      await tx.user.createMany({ data: users.map((id, index) => ({ id, name: names[index], createdAt: joinedAt })) });
      await tx.visitor.createMany({ data: visitors.map((id, index) => ({
        id, tokenHash: "directory-qa-" + id, firstSeenAt: joinedAt, lastSeenAt,
        consentStatus: index === 8 ? "WITHDRAWN" as const : "GRANTED" as const,
        trackingDisabledAt: index === 9 ? joinedAt : null,
        currentUserId: index === 10 ? users[0] : null,
      })) });
      await tx.visitorIdentityLink.create({ data: { visitorId: visitors[11], userId: users[0], source: "SIGN_IN" } });
      const searches = [
        ...users.slice(0, 6).map(userId => ({ userId, visitorId: null, at: lastSeenAt, environment: "staging", session: undefined })),
        ...operational.flatMap((session, index) => [
          { userId: null, visitorId: null, at: index < 2 ? oldJoinedAt : joinedAt, environment: "staging", session },
          ...(index === 0 ? [] : [{ userId: null, visitorId: null, at: lastSeenAt, environment: "staging", session }]),
        ]),
        { userId: null, visitorId: null, at: lastSeenAt, environment: "production", session: excludedOperational[0] },
        { userId: users[0], visitorId: null, at: lastSeenAt, environment: "staging", session: excludedOperational[1] },
        { userId: null, visitorId: visitors[0], at: lastSeenAt, environment: "staging", session: excludedOperational[2] },
        { userId: null, visitorId: null, at: lastSeenAt, environment: "staging", session: "invalid-" + prefix },
        // A newer observation from the other environment must not change a
        // valid staging session's position or its first-recorded date.
        { userId: null, visitorId: null, at: new Date(+now - 1_000), environment: "production", session: operational[0] },
      ];
      await tx.searchHistory.createMany({ data: searches.map(row => {
        const id = randomUUID(); searchIds.push(id);
        return { id, type: "CAR" as const, userId: row.userId, visitorId: row.visitorId, createdAt: row.at,
          query: { environment: row.environment, ...(row.session ? { operationalSessionId: row.session, operationalSessionExpiresAtMs: +now + 60_000 } : {}) } };
      }) });
      const handoffId = randomUUID(); redirectIds.push(handoffId);
      await tx.redirectLog.create({ data: { id: handoffId, type: "CAR", provider: "QA", destinationUrl: "https://example.invalid",
        userType: "GUEST", sourcePage: "QA", createdAt: lastSeenAt,
        metadata: { environment: "staging", operationalSessionId: operational[0], operationalSessionExpiresAtMs: +now + 60_000 } } });
      const assertTotals = (rows: AdminIdentityDirectoryRow[], scoped = BigInt(9)) => {
        assert.ok(rows.length > 0, "summary survives even when no identity matches");
        for (const row of rows) {
          assert.equal(row.operationalGuestCount, scoped);
          assert.equal(row.operationalAllTimeCount, baseline.operationalAllTimeCount + BigInt(9));
          assert.equal(row.operationalNewCount, baseline.operationalNewCount + BigInt(7));
        }
      };
      for (const sort of ["newest", "oldest", "name_asc", "name_desc"] as const) {
        const ordered = [...expected].sort(compare(sort));
        const first = await read({ sort });
        const second = await read({ sort, offset: 20 });
        assert.equal(first.length, 20, sort);
        assert.equal(second.length, 4, sort);
        assert.deepEqual([...first, ...second].map(row => [row.kind, row.id]), ordered.map(row => [row.kind, row.id]), sort);
        assert.equal(new Set([...first, ...second].map(row => row.id)).size, 24, sort);
        assertTotals(first); assertTotals(second);
        for (const row of [...first, ...second]) {
          const identity = expected.find(candidate => candidate.id === row.id)!;
          assert.equal(row.lastSeenAt?.toISOString() ?? null, identity.lastSeenAt?.toISOString() ?? null);
        }
      }
      const beyond = await read({ offset: 40 });
      assert.deepEqual(beyond.map(row => [row.kind, row.id, row.firstSeenAt, row.lastSeenAt, row.guestSource, row.guestStatus]), [[null, null, null, null, null, null]]);
      assertTotals(beyond);
      const empty = await read({ query: prefix + "-no-match" });
      assert.deepEqual(empty.map(row => [row.kind, row.id]), [[null, null]]);
      assertTotals(empty, BigInt(0));
      const summaryOnly = await read({ showUsers: false, showGuests: false, showOperationalGuests: false, offset: 40 });
      assert.deepEqual(summaryOnly.map(row => [row.kind, row.id]), [[null, null]]);
      assertTotals(summaryOnly);
    }, { isolationLevel: "RepeatableRead", timeout: 30_000 });
  } finally {
    await db.redirectLog.deleteMany({ where: { id: { in: redirectIds } } });
    await db.searchHistory.deleteMany({ where: { id: { in: searchIds } } });
    await db.visitor.deleteMany({ where: { id: { in: visitors } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

test("registered directory dates and Last Seen respect Visitor withdrawal in PostgreSQL", {
  skip: !process.env.GUEST_COUNTRY_TEST_DATABASE_URL,
}, async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = process.env.GUEST_COUNTRY_TEST_DATABASE_URL!;
  const db = getPrisma();
  const userId = randomUUID(), visitorId = randomUUID();
  const at = new Date("2026-11-26T12:00:00Z");
  const now = new Date(+at + 60_000);
  const request = {
    query: userId, role: "ALL", status: "ACTIVE", showUsers: true, showGuests: false,
    limit: 20, offset: 0, date: "today", environment: "staging", timeZone: "UTC", now,
  } satisfies AdminIdentityPageRequest;
  const snapshot = async (input = request) => {
    const [counts, rows] = await db.$transaction([
      db.$queryRaw<{ count: bigint }[]>(adminRegisteredIdentityCountSql(input)),
      db.$queryRaw<AdminIdentityDirectoryRow[]>(adminIdentityPageSql(input)!),
    ]);
    assert.equal(Number(counts[0].count), rows.length);
    return rows;
  };
  try {
    await db.user.create({ data: { id: userId, email: userId + "@example.invalid", emailVerified: at,
      createdAt: new Date("2026-10-01T00:00:00Z"), status: "ACTIVE" } });
    await db.visitor.create({ data: { id: visitorId, tokenHash: randomUUID(), currentUserId: userId,
      consentStatus: "GRANTED", identityLinks: { create: { userId, source: "SIGN_IN" } } } });
    await db.analyticsEvent.create({ data: { userId, visitorId, createdAt: at, type: "SHARE", name: "share_link_copied",
      metadata: { environment: "staging", recordPurpose: "optional_analytics" } } });
    assert.equal((await snapshot())[0].lastSeenAt?.getTime(), +at);
    await db.visitor.update({ where: { id: visitorId }, data: { consentStatus: "WITHDRAWN", trackingDisabledAt: now } });
    assert.deepEqual(await snapshot(), []);
    const after = await db.$queryRaw<AdminIdentityDirectoryRow[]>(adminIdentityPageSql({ ...request, date: "all" })!);
    assert.equal(after[0].lastSeenAt, null);
    assert.equal(await db.analyticsEvent.count({ where: { visitorId } }), 1);
    const essentialAt = new Date(+at - 1000);
    await db.analyticsEvent.createMany({ data: [
      { userId, createdAt: essentialAt, type: "SAVE", name: "saved_item_confirmed", metadata: { environment: "staging" } },
      { userId, createdAt: at, type: "SAVE", name: "local_saved", metadata: { environment: "staging" } },
      { userId, createdAt: at, type: "SAVE", name: "saved_item_confirmed", metadata: { environment: "staging", recordPurpose: "optional_analytics" } },
      { userId, createdAt: at, type: "SAVE", name: "saved_item_confirmed", metadata: { environment: "production" } },
    ] });
    assert.equal((await snapshot())[0].lastSeenAt?.getTime(), +essentialAt);
    const visitorFree = await db.analyticsEvent.findMany({ where: { userId, AND: [
      visitorFreeAccountAnalyticsWhere(), { metadata: { path: ["environment"], equals: "staging" } },
    ] } });
    assert.equal(visitorFree.length, 1);
    assert.equal(visitorFree[0].name, "saved_item_confirmed");
  } finally {
    await db.analyticsEvent.deleteMany({ where: { userId } });
    await db.visitor.deleteMany({ where: { id: visitorId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  }
});
