import test from "node:test";
import assert from "node:assert/strict";
import { guestLiveCountryEnabled, guestLiveCountryObservation, safeGuestLiveCountry } from "./guestLiveCountry";

test("only separately enabled staging and authenticated edge can attest a valid country",()=>{
  const keys=["GUEST_LIVE_COUNTRY_ENABLED","BOT_EDGE_SECRET","RENDER","GUEST_FIRST_ACCESS_PREVIEW"] as const;
  const prior=keys.map(key=>process.env[key]);
  try {
    delete process.env.GUEST_LIVE_COUNTRY_ENABLED;
    delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    process.env.BOT_EDGE_SECRET="synthetic-qa-assertion-material-for-tests";
    process.env.RENDER="true";
    const request=(country:string,assertion?:string)=>new Request("https://example.invalid",{headers:{"cf-ipcountry":country,"cf-ipcity":"Lagos","cf-connecting-ip":"203.0.113.1",...(assertion?{"x-kurioticket-edge-auth":assertion}:{})}});
    const secret=process.env.BOT_EDGE_SECRET!;
    assert.equal(guestLiveCountryEnabled("staging"),false);
    assert.equal(guestLiveCountryObservation(request("NG",secret),"staging"),null);
    process.env.GUEST_LIVE_COUNTRY_ENABLED="true";
    assert.equal(guestLiveCountryEnabled("staging"),true);
    assert.equal(guestLiveCountryEnabled("production"),false);
    assert.equal(guestLiveCountryObservation(request("NG",secret),"staging"),"NG");
    assert.equal(guestLiveCountryObservation(request("NG",secret),"production"),null);
    assert.equal(guestLiveCountryObservation(request("NG"),"staging"),null);
    assert.equal(guestLiveCountryObservation(request("NG","wrong"),"staging"),null);
    for(const country of ["XX","T1","ZZ","","NGA"])assert.equal(guestLiveCountryObservation(request(country,secret),"staging"),null);
    assert.equal(safeGuestLiveCountry("ng"),"NG");
  } finally {keys.forEach((key,i)=>{if(prior[i]===undefined)delete process.env[key];else process.env[key]=prior[i];});}
});
