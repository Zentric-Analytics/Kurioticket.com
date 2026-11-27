import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma";
import { guestAccessHistorySql, guestLatestRecordedLocationsSql } from "./adminGuestAccessSql";
import { recordedGuestAccessLocation, recordedGuestLocationSummary } from "./guestAccessObservation";
import { operationalGuestDeviceObservation } from "./operationalGuestDeviceObservation";

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
