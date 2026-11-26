import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { getPrisma } from "./prisma";
import { writeGuestPresenceDetails } from "./liveGuestPresenceWrite";
import type { OnlinePresenceHeartbeat } from "./onlinePresenceRoute";

test("PostgreSQL country writes are scoped to accepted guest heartbeats without first access", {skip:!process.env.GUEST_COUNTRY_TEST_DATABASE_URL}, async()=>{
  const previousUrl=process.env.DATABASE_URL;
  const previousFlag=process.env.GUEST_LIVE_COUNTRY_ENABLED,previousPreview=process.env.GUEST_FIRST_ACCESS_PREVIEW;
  process.env.DATABASE_URL=process.env.GUEST_COUNTRY_TEST_DATABASE_URL!;
  process.env.GUEST_LIVE_COUNTRY_ENABLED="true";
  delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
  const db=getPrisma();
  const sourceId=randomBytes(32).toString("hex");
  const now=new Date("2026-11-26T12:00:00Z");
  const heartbeat:OnlinePresenceHeartbeat={environment:"staging",sourceId,platform:"desktop_web",accountSessionId:null,now,guestLiveCountryCode:"NG"};
  const read=(environment="staging")=>db.onlinePresenceSession.findUniqueOrThrow({where:{environment_sourceId:{environment,sourceId}}});
  try {
    assert.equal(await writeGuestPresenceDetails(db,heartbeat),1);
    let row=await read();
    assert.equal(row.guestLiveCountryCode,"NG");
    assert.equal(+row.guestLiveCountryObservedAt!,+row.lastSeenAt);
    assert.equal(row.guestFirstSeenAt,null);
    assert.equal(row.guestObservedAt,null);
    assert.equal(row.guestCountryCode,null);
    assert.equal(row.guestDeviceLabel,null);
    assert.equal(await writeGuestPresenceDetails(db,{...heartbeat,now:new Date(+now+5000),guestLiveCountryCode:"GB"}),0);
    assert.equal((await read()).guestLiveCountryCode,"NG");
    await writeGuestPresenceDetails(db,{...heartbeat,now:new Date(+now+30000),guestLiveCountryCode:null});
    row=await read();
    assert.equal(row.guestLiveCountryCode,null);
    assert.equal(row.guestLiveCountryObservedAt,null);
    assert.equal(await writeGuestPresenceDetails(db,heartbeat),0);
    assert.equal((await read()).guestLiveCountryCode,null);
    await writeGuestPresenceDetails(db,{...heartbeat,environment:"production"});
    assert.equal((await read("production")).guestLiveCountryCode,null);
    delete process.env.GUEST_LIVE_COUNTRY_ENABLED;
    await writeGuestPresenceDetails(db,{...heartbeat,now:new Date(+now+60000)});
    assert.equal((await read()).guestLiveCountryCode,null);
  } finally {
    await db.onlinePresenceSession.deleteMany({where:{sourceId}});
    await db.$disconnect();
    for(const [key,value] of [["DATABASE_URL",previousUrl],["GUEST_LIVE_COUNTRY_ENABLED",previousFlag],["GUEST_FIRST_ACCESS_PREVIEW",previousPreview]] as const) {
      if(value===undefined)delete process.env[key];else process.env[key]=value;
    }
  }
});
