import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

const endpoint="https://kurioticket.test/api/mobile/v1/cars/location-embed";
const valid=()=>new URLSearchParams({id:"static-car-luxury-eclass",pickupLocation:"Paris Charles de Gaulle Airport",dropoffLocation:"Paris Charles de Gaulle Airport",pickupDate:"2026-09-06",pickupTime:"10:00",dropoffDate:"2026-09-09",dropoffTime:"10:00",driverAge:"30"});

test("cars map wrapper validates the complete search identity and supported view",async()=>{
  assert.equal((await GET(new Request(endpoint))).status,400);
  const unknown=valid();unknown.set("id","unknown");
  assert.equal((await GET(new Request(`${endpoint}?${unknown}`))).status,404);
  const unsupported=valid();unsupported.set("view","satellite");
  assert.equal((await GET(new Request(`${endpoint}?${unsupported}`))).status,400);
  const missingStreetCoordinates=valid();missingStreetCoordinates.set("view","streetview");
  assert.equal((await GET(new Request(`${endpoint}?${missingStreetCoordinates}`))).status,400);
});

test("cars map wrapper fails closed without its server key",async()=>{
  const previous=process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  try{assert.equal((await GET(new Request(`${endpoint}?${valid()}`))).status,503);}finally{if(previous!==undefined)process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=previous;}
});

test("cars map wrapper returns hardened map HTML and ignores attempted URL or key injection",async()=>{
  const previous=process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY="fake-test-key";
  try{
    const query=valid();query.set("googleKey","attacker");query.set("googleUrl","https://evil.test");query.set("iframeUrl","https://evil.test");
    const response=await GET(new Request(`${endpoint}?${query}`));const html=await response.text();
    assert.equal(response.status,200);
    assert.match(html,/\/maps\/embed\/v1\/place/);
    assert.match(html,/Paris\+Charles\+de\+Gaulle\+Airport/);
    assert.doesNotMatch(html,/evil\.test|attacker/);
    assert.equal(response.headers.get("referrer-policy"),"strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-content-type-options"),"nosniff");
    assert.match(response.headers.get("content-security-policy")??"",/frame-src https:\/\/www\.google\.com/);
  }finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=previous;}
});

test("cars map wrapper returns an interactive Street View embed only for explicit validated coordinates",async()=>{
  const previous=process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY="fake-test-key";
  try{
    const query=valid();query.set("view","streetview");query.set("latitude","49.0097");query.set("longitude","2.5479");
    const response=await GET(new Request(`${endpoint}?${query}`));const html=await response.text();
    assert.equal(response.status,200);
    assert.match(html,/\/maps\/embed\/v1\/streetview/);
    assert.match(html,/location=49\.0097%2C2\.5479/);
    assert.match(html,/radius=250/);
    assert.match(html,/source=outdoor/);
    assert.match(html,/Car pickup area Street View/);
  }finally{if(previous===undefined)delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY;else process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=previous;}
});
