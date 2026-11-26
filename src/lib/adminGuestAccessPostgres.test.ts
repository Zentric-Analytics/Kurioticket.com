import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma";
import { guestAccessHistorySql } from "./adminGuestAccessSql";
import { recordedGuestAccessLocation } from "./guestAccessObservation";

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
    assert.doesNotMatch(JSON.stringify(result,(_,v)=>typeof v==="bigint"?String(v):v),/203\.0\.113\.1|ipAddress/);
  } finally {
    await db.redirectLog.deleteMany({where:{id:redirectId}});
    await db.searchHistory.deleteMany({where:{id:{in:ids}}});
    await db.$disconnect();
    if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;
  }
});
