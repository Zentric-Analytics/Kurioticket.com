import test from "node:test";
import assert from "node:assert/strict";
import { createGuestCountryResolver, guestLiveCountryEnabled, guestLiveCountryObservation, renderGuestCountryIp, safeGuestLiveCountry } from "./guestLiveCountry";

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

test("live fallback trusts managed public client IP, not an unauthenticated country header",async()=>{
  const keys=["GUEST_LIVE_COUNTRY_ENABLED","BOT_EDGE_SECRET","RENDER","NEXT_PUBLIC_APP_URL","RENDER_EXTERNAL_HOSTNAME","GUEST_FIRST_ACCESS_PREVIEW","GUEST_LIVE_RENDER_INGRESS_VERIFIED"] as const;
  const before=keys.map(key=>process.env[key]);
  try {
    process.env.GUEST_LIVE_COUNTRY_ENABLED="true";
    delete process.env.GUEST_FIRST_ACCESS_PREVIEW;
    process.env.RENDER="true";
    process.env.NEXT_PUBLIC_APP_URL="https://staging.example.invalid";
    process.env.RENDER_EXTERNAL_HOSTNAME="qa.onrender.com";
    process.env.BOT_EDGE_SECRET="qa-only-country-edge-assertion-material";
    const calls:string[]=[];
    const resolve=createGuestCountryResolver(async ip=>{calls.push(ip);return ip==="8.8.8.8"?"NG":"GB";});
    const req=(headers:Record<string,string>,host="staging.example.invalid")=>new Request("https://"+host+"/api/identity/online-presence",{headers});
    const headers={"cf-connecting-ip":"8.8.8.8","cf-ipcountry":"US","x-country":"US","x-forwarded-for":"1.1.1.1"};
    delete process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED;
    assert.equal(await resolve(req(headers),"staging"),null,"hostname and RENDER alone are not trusted ingress");
    assert.deepEqual(calls,[]);
    process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED="true";
    assert.equal(await resolve(req(headers),"staging"),"NG");
    assert.equal(await resolve(req({...headers,"cf-ipcountry":"JP"}),"staging"),"NG");
    assert.deepEqual(calls,["8.8.8.8"]);
    assert.equal(await resolve(req(headers,"other.example.invalid"),"staging"),null);
    assert.equal(await resolve(req({"cf-ipcountry":"NG","x-forwarded-for":"8.8.8.8"}),"staging"),null);
    assert.equal(await resolve(req({...headers,"cf-worker":"foreign.example"}),"staging"),null);
    assert.equal(await resolve(req({"cf-connecting-ip":"2a06:98c0:3600::103"}),"staging"),null);
    assert.equal(await resolve(req({"cf-connecting-ip":"127.0.0.1"}),"staging"),null);
    assert.equal(await resolve(req(headers),"production"),null);
    assert.equal(await resolve(req({...headers,"x-kurioticket-edge-auth":process.env.BOT_EDGE_SECRET!}),"staging"),"US");
    assert.deepEqual(calls,["8.8.8.8"]);
    assert.equal(await resolve(req({"cf-connecting-ip":"1.1.1.1"},"qa.onrender.com"),"staging"),"GB");
    assert.deepEqual(calls,["8.8.8.8","1.1.1.1"]);
    delete process.env.RENDER;
    assert.equal(renderGuestCountryIp(req(headers)),null);
    assert.equal(await resolve(req(headers),"staging"),null);
    delete process.env.GUEST_LIVE_COUNTRY_ENABLED;
    assert.equal(await resolve(req({...headers,"x-kurioticket-edge-auth":process.env.BOT_EDGE_SECRET!}),"staging"),null);
  } finally {keys.forEach((key,i)=>{if(before[i]===undefined)delete process.env[key];else process.env[key]=before[i];});}
});
