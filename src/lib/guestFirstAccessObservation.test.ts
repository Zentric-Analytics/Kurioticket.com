import assert from "node:assert/strict";
import test from "node:test";
import { guestFirstAccessObservation, guestFirstAccessPreviewEnabled, liveGuestCountryName, safeLiveGuestAccess } from "./guestFirstAccessObservation";

test("preview is disabled by default and always disabled in production",()=>{
  const previous=process.env.GUEST_FIRST_ACCESS_PREVIEW;
  try {
    delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    assert.equal(guestFirstAccessPreviewEnabled("staging"),false);
    process.env.GUEST_FIRST_ACCESS_PREVIEW="true";
    assert.equal(guestFirstAccessPreviewEnabled("staging"),true);
    assert.equal(guestFirstAccessPreviewEnabled("production"),false);
  } finally {
    if(previous===undefined)delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    else process.env.GUEST_FIRST_ACCESS_PREVIEW=previous;
  }
});
test("country is trusted-edge only and no raw network or device identifiers are returned",()=>{
  const request=new Request("https://example.invalid",{headers:{
    "cf-ipcountry":"NG","cf-ipcity":"Lagos","cf-connecting-ip":"203.0.113.1",
    "user-agent":"Mozilla/5.0 (Windows NT 10.0) Chrome/140.0.0.0",
  }});
  const value=guestFirstAccessObservation(request,"desktop_web",true);
  assert.deepEqual(value,{countryCode:"NG",deviceLabel:"Windows computer",browser:"Chrome 140",os:"Windows"});
  assert.doesNotMatch(JSON.stringify(value),/Lagos|203\.0\.113|Mozilla/);
  assert.equal(guestFirstAccessObservation(request,"desktop_web",false).countryCode,null);
  assert.equal(liveGuestCountryName("NG"),"Nigeria");
  assert.equal(liveGuestCountryName("XX"),null);
  assert.equal(guestFirstAccessObservation(new Request(request.url),"mobile_web").deviceLabel,null);
  assert.equal(guestFirstAccessObservation(new Request(request.url),"ios").deviceLabel,"iOS device");
  assert.equal(guestFirstAccessObservation(new Request(request.url),"android").deviceLabel,"Android device");
});
test("projection rejects invalid references and future first access; sanitizes details",()=>{
  const at=new Date("2026-11-26T12:00:00Z");
  const value={reference:"A".repeat(43),firstSeenAt:at.toISOString(),countryCode:"NG",deviceLabel:"raw-device-id",browser:"secret-token",os:"Windows"};
  assert.equal(safeLiveGuestAccess(value,at)?.deviceLabel,null);
  assert.equal(safeLiveGuestAccess(value,at)?.browser,null);
  assert.equal(safeLiveGuestAccess(value,at)?.os,"Windows");
  assert.equal(safeLiveGuestAccess({...value,reference:"guest-1"},at),null);
  assert.equal(safeLiveGuestAccess({...value,firstSeenAt:new Date(+at+1).toISOString()},at),null);
});
